// Booking business logic. Callers (route handlers) authenticate first and pass
// the acting user in; every rule that protects data is enforced HERE, on the
// server, never trusted from the client.
import "server-only";
import { Prisma, type Booking } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import {
  ACTIVE_STATUSES,
  canTransition,
  earliestStart,
  isOfferedStart,
  latestStart,
  PAYMENT,
  type AvailabilityWindow,
} from "@/lib/booking-rules";
import { conflict, forbidden, HttpError, notFound, tooMany } from "@/lib/errors";
import { allowed, limiters } from "@/lib/rate-limit";
import { formatInZone, safeTimezone } from "@/lib/time";
import {
  bookingCancelSchema,
  bookingCompleteSchema,
  bookingRescheduleSchema,
  bookingSchema,
  reviewSchema,
  savedMentorSchema,
} from "@/lib/validators";
import type { CurrentUser } from "@/lib/auth/guards";
import { createNotification } from "@/features/notifications/service";
import { resolveMeeting } from "@/services/calendar";
import { assertBookable } from "@/services/payments";

type Tx = Prisma.TransactionClient;

const SLOT_TAKEN = "That slot was just taken. Please pick another.";

/**
 * Serializes concurrent bookings that touch the same mentor or student. The
 * advisory lock is released automatically when the transaction ends. Keys are
 * always taken mentor-first so two requests can never deadlock each other.
 * (The Booking_no_overlap exclusion constraint is the backstop if this is bypassed.)
 */
async function lockMentorAndStudent(tx: Tx, mentorProfileId: string, studentId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"mentor:" + mentorProfileId}))`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"student:" + studentId}))`;
}

/** Translates the database's overlap-constraint error into a friendly conflict. */
function mapDbConflict(err: unknown): never {
  const msg = err instanceof Error ? err.message : "";
  if (msg.includes("Booking_no_overlap") || msg.includes("23P01")) throw conflict(SLOT_TAKEN);
  throw err;
}

async function assertNoOverlap(tx: Tx, opts: { mentorProfileId: string; studentId: string; startsAt: Date; endsAt: Date; ignoreBookingId?: string }) {
  const overlapping = { startsAt: { lt: opts.endsAt }, endsAt: { gt: opts.startsAt } };
  const notSelf = opts.ignoreBookingId ? { id: { not: opts.ignoreBookingId } } : {};
  const mentorBusy = await tx.booking.count({
    where: { mentorProfileId: opts.mentorProfileId, status: { in: ACTIVE_STATUSES }, ...overlapping, ...notSelf },
  });
  if (mentorBusy > 0) throw conflict(SLOT_TAKEN);
  const studentBusy = await tx.booking.count({
    where: { studentId: opts.studentId, status: { in: ACTIVE_STATUSES }, ...overlapping, ...notSelf },
  });
  if (studentBusy > 0) throw conflict("You already have a session booked at that time.");
}

/** Validates a requested start against mentor availability, notice period and horizon. */
function assertStartAllowed(
  startsAt: Date,
  mentor: { sessionLength: number; timezone: string; availability: AvailabilityWindow[] },
  now: Date,
) {
  if (Number.isNaN(startsAt.getTime())) throw new HttpError(422, "Pick a valid date and time.");
  if (startsAt < earliestStart(now)) throw new HttpError(422, "Pick a time at least an hour from now.");
  if (startsAt > latestStart(now)) throw new HttpError(422, "Pick a time within the next 60 days.");
  const offered = isOfferedStart({
    startsAt,
    windows: mentor.availability,
    timezone: mentor.timezone,
    sessionLength: mentor.sessionLength,
  });
  if (!offered) throw conflict("That time isn't in this mentor's availability.");
}

async function timezonesFor(userIds: string[]) {
  const rows = await db.profile.findMany({ where: { userId: { in: userIds } }, select: { userId: true, timezone: true } });
  return new Map(rows.map((r) => [r.userId, safeTimezone(r.timezone)]));
}

// ---------------------------------------------------------------------------

export async function createBooking(actor: CurrentUser, input: unknown): Promise<Booking> {
  if (actor.role !== "STUDENT") throw forbidden("Only students can book sessions.");
  const data = bookingSchema.parse(input);
  if (!(await allowed([limiters.booking.check(actor.id)]))) throw tooMany();

  const now = new Date();
  const startsAt = new Date(data.startsAt);

  let booking: Booking;
  let mentorUserId: string;
  let mentorName: string | null;
  let mentorTz: string;
  try {
    ({ booking, mentorUserId, mentorName, mentorTz } = await db.$transaction(
      async (tx) => {
        const mentor = await tx.mentorProfile.findUnique({
          where: { id: data.mentorProfileId },
          include: { user: { select: { name: true } }, availability: true },
        });
        if (!mentor || mentor.status !== "APPROVED") throw notFound("Mentor not found.");
        if (!mentor.acceptingBookings) throw conflict("This mentor isn't accepting bookings right now.");
        if (mentor.userId === actor.id) throw forbidden("You can't book your own sessions.");

        // The price always comes from the mentor's profile, never from the request.
        assertBookable(mentor.rateCents);
        assertStartAllowed(startsAt, mentor, now);

        await lockMentorAndStudent(tx, mentor.id, actor.id);
        const endsAt = new Date(startsAt.getTime() + mentor.sessionLength * 60_000);
        await assertNoOverlap(tx, { mentorProfileId: mentor.id, studentId: actor.id, startsAt, endsAt });

        const meeting = resolveMeeting(mentor);
        const booking = await tx.booking.create({
          data: {
            studentId: actor.id,
            mentorProfileId: mentor.id,
            startsAt,
            endsAt,
            topic: data.topic,
            notes: data.notes || null,
            // Free session: confirmed immediately, no payment involved.
            amountCents: 0,
            currency: mentor.currency,
            status: "CONFIRMED",
            paymentStatus: PAYMENT.NOT_REQUIRED,
            meetingUrl: meeting.url,
            meetingKind: meeting.kind,
          },
        });
        return { booking, mentorUserId: mentor.userId, mentorName: mentor.user.name, mentorTz: safeTimezone(mentor.timezone) };
      },
      { maxWait: 5_000, timeout: 10_000 },
    ));
  } catch (err) {
    mapDbConflict(err);
  }

  const tzs = await timezonesFor([actor.id]);
  await Promise.all([
    createNotification({
      userId: mentorUserId,
      type: "BOOKING_CREATED",
      title: `New booking from ${actor.name ?? "a student"}`,
      body: `${formatInZone(booking.startsAt, mentorTz)} — ${booking.topic}`,
      link: `/dashboard/mentor/bookings/${booking.id}`,
    }),
    createNotification({
      userId: actor.id,
      type: "BOOKING_CONFIRMED",
      title: `Booking with ${mentorName ?? "your mentor"} confirmed`,
      body: `${formatInZone(booking.startsAt, tzs.get(actor.id) ?? "UTC")} — ${booking.topic}`,
      link: `/dashboard/student/bookings/${booking.id}`,
    }),
  ]);
  revalidatePath("/dashboard", "layout");
  return booking;
}

/** Loads a booking only if the actor is the student, the mentor, or an admin. Otherwise "not found" (no existence leak). */
async function loadForParticipant(actor: CurrentUser, bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { mentorProfile: { select: { id: true, userId: true, sessionLength: true, timezone: true, status: true, acceptingBookings: true } } },
  });
  const isParticipant = booking && (booking.studentId === actor.id || booking.mentorProfile.userId === actor.id);
  if (!booking || (!isParticipant && actor.role !== "ADMIN")) throw notFound("Booking not found.");
  return booking;
}

export async function cancelBooking(actor: CurrentUser, bookingId: string, input: unknown): Promise<Booking> {
  const { reason } = bookingCancelSchema.parse(input ?? {});
  const booking = await loadForParticipant(actor, bookingId);

  if (booking.status === "CANCELLED") return booking; // idempotent
  if (!canTransition(booking.status, "CANCELLED")) throw conflict("This booking can no longer be cancelled.");
  if (booking.startsAt <= new Date()) throw conflict("This session has already started, so it can't be cancelled.");

  // Conditional update: if a concurrent request changed the status first, count is 0.
  const result = await db.booking.updateMany({
    where: { id: booking.id, status: { in: ACTIVE_STATUSES } },
    data: { status: "CANCELLED", cancelReason: reason || null, cancelledAt: new Date() },
  });
  if (result.count !== 1) throw conflict("This booking was just updated. Refresh and try again.");

  // Tell the other party (an admin cancelling notifies both). The slot is free again:
  // CANCELLED bookings are excluded from every overlap check and from the DB constraint.
  const byStudent = actor.id === booking.studentId;
  const byMentor = actor.id === booking.mentorProfile.userId;
  const who = byStudent ? "the student" : byMentor ? "the mentor" : "an administrator";
  const notify: { userId: string; link: string }[] = [];
  if (!byStudent) notify.push({ userId: booking.studentId, link: `/dashboard/student/bookings/${booking.id}` });
  if (!byMentor) notify.push({ userId: booking.mentorProfile.userId, link: `/dashboard/mentor/bookings/${booking.id}` });
  await Promise.all(
    notify.map((n) =>
      createNotification({
        userId: n.userId,
        type: "BOOKING_CANCELLED",
        title: "A booking was cancelled",
        body: `Cancelled by ${who}.${reason ? ` Reason: ${reason}` : ""}`,
        link: n.link,
      }),
    ),
  );
  revalidatePath("/dashboard", "layout");
  return db.booking.findUniqueOrThrow({ where: { id: booking.id } });
}

export async function rescheduleBooking(actor: CurrentUser, bookingId: string, input: unknown): Promise<Booking> {
  const data = bookingRescheduleSchema.parse(input);
  const booking = await loadForParticipant(actor, bookingId);
  if (booking.studentId !== actor.id) throw forbidden("Only the student who booked can reschedule.");
  if (!ACTIVE_STATUSES.includes(booking.status)) throw conflict("This booking can no longer be rescheduled.");

  const now = new Date();
  if (booking.startsAt <= now) throw conflict("This session has already started, so it can't be rescheduled.");
  const startsAt = new Date(data.startsAt);

  let next: Booking;
  try {
    next = await db.$transaction(
      async (tx) => {
        const mentor = await tx.mentorProfile.findUniqueOrThrow({
          where: { id: booking.mentorProfileId },
          include: { availability: true },
        });
        if (mentor.status !== "APPROVED" || !mentor.acceptingBookings) {
          throw conflict("This mentor isn't accepting bookings right now.");
        }
        assertStartAllowed(startsAt, mentor, now);
        await lockMentorAndStudent(tx, mentor.id, actor.id);

        // Re-read under the lock: it may have been cancelled or already rescheduled meanwhile.
        const current = await tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
        if (!ACTIVE_STATUSES.includes(current.status)) throw conflict("This booking can no longer be rescheduled.");

        const endsAt = new Date(startsAt.getTime() + mentor.sessionLength * 60_000);
        await assertNoOverlap(tx, { mentorProfileId: mentor.id, studentId: actor.id, startsAt, endsAt, ignoreBookingId: booking.id });

        // Cancel the old booking FIRST so its slot is released (and the DB overlap
        // constraint is satisfied) even when the new time overlaps the old one.
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "CANCELLED", cancelledAt: now, cancelReason: "Rescheduled" },
        });
        return tx.booking.create({
          data: {
            studentId: booking.studentId,
            mentorProfileId: booking.mentorProfileId,
            startsAt,
            endsAt,
            topic: booking.topic,
            notes: booking.notes,
            amountCents: booking.amountCents,
            currency: booking.currency,
            status: current.status,
            paymentStatus: current.paymentStatus,
            paymentIntentId: current.paymentIntentId,
            rescheduledFromId: booking.id,
            meetingUrl: booking.meetingUrl,
            meetingKind: booking.meetingKind,
          },
        });
      },
      { maxWait: 5_000, timeout: 10_000 },
    );
  } catch (err) {
    mapDbConflict(err);
  }

  const tzs = await timezonesFor([booking.studentId, booking.mentorProfile.userId]);
  await Promise.all([
    createNotification({
      userId: booking.mentorProfile.userId,
      type: "BOOKING_RESCHEDULED",
      title: "A booking was rescheduled",
      body: `New time: ${formatInZone(next.startsAt, tzs.get(booking.mentorProfile.userId) ?? "UTC")}`,
      link: `/dashboard/mentor/bookings/${next.id}`,
    }),
    createNotification({
      userId: booking.studentId,
      type: "BOOKING_RESCHEDULED",
      title: "Booking rescheduled",
      body: `New time: ${formatInZone(next.startsAt, tzs.get(booking.studentId) ?? "UTC")}`,
      link: `/dashboard/student/bookings/${next.id}`,
    }),
  ]);
  revalidatePath("/dashboard", "layout");
  return next;
}

/** Mentor (or admin) records what happened once the session has ended. Unlocks reviews. */
export async function completeBooking(actor: CurrentUser, bookingId: string, input: unknown): Promise<Booking> {
  const { outcome } = bookingCompleteSchema.parse(input ?? {});
  const booking = await loadForParticipant(actor, bookingId);
  if (booking.mentorProfile.userId !== actor.id && actor.role !== "ADMIN") {
    throw forbidden("Only the mentor can mark a session as finished.");
  }
  if (!canTransition(booking.status, outcome)) throw conflict("Only a confirmed session can be marked as finished.");
  if (booking.endsAt > new Date()) throw conflict("The session hasn't ended yet.");

  const updated = await db.$transaction(async (tx) => {
    const res = await tx.booking.updateMany({
      where: { id: booking.id, status: "CONFIRMED" },
      data: { status: outcome, completedAt: new Date() },
    });
    if (res.count !== 1) throw conflict("This booking was just updated. Refresh and try again.");
    if (outcome === "COMPLETED") {
      await tx.mentorProfile.update({ where: { id: booking.mentorProfileId }, data: { totalSessions: { increment: 1 } } });
    }
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
  });

  if (outcome === "COMPLETED") {
    await createNotification({
      userId: booking.studentId,
      type: "SYSTEM",
      title: "How was your session?",
      body: "Leave a quick review to help other students.",
      link: `/dashboard/student/bookings/${booking.id}`,
    });
  }
  revalidatePath("/dashboard", "layout");
  return updated;
}

export async function leaveReview(actor: CurrentUser, input: unknown) {
  if (actor.role !== "STUDENT") throw forbidden("Only students can leave reviews.");
  const data = reviewSchema.parse(input);

  const booking = await db.booking.findUnique({
    where: { id: data.bookingId },
    include: { mentorProfile: { select: { userId: true } } },
  });
  // Someone else's booking looks the same as a missing one.
  if (!booking || booking.studentId !== actor.id) throw notFound("Booking not found.");
  if (booking.status !== "COMPLETED") throw conflict("You can review a session once it's completed.");

  const { review, created } = await db.$transaction(async (tx) => {
    const existing = await tx.review.findUnique({ where: { bookingId: booking.id }, select: { id: true } });
    const review = await tx.review.upsert({
      where: { bookingId: booking.id },
      update: { rating: data.rating, comment: data.comment || null },
      create: {
        bookingId: booking.id,
        mentorProfileId: booking.mentorProfileId,
        authorId: actor.id,
        rating: data.rating,
        comment: data.comment || null,
      },
    });
    const agg = await tx.review.aggregate({
      where: { mentorProfileId: booking.mentorProfileId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await tx.mentorProfile.update({
      where: { id: booking.mentorProfileId },
      data: { averageRating: agg._avg.rating ?? 0, totalReviews: agg._count.rating },
    });
    return { review, created: !existing };
  });

  if (created) {
    await createNotification({
      userId: booking.mentorProfile.userId,
      type: "REVIEW_LEFT",
      title: `New ${data.rating}★ review`,
      body: data.comment || undefined,
      link: "/dashboard/mentor/reviews",
    });
  }
  revalidatePath("/dashboard", "layout");
  return review;
}

export async function toggleSave(actor: CurrentUser, input: unknown) {
  if (actor.role !== "STUDENT") throw forbidden("Only students can save mentors.");
  const { mentorProfileId } = savedMentorSchema.parse(input);

  const mentor = await db.mentorProfile.findUnique({ where: { id: mentorProfileId }, select: { status: true } });
  if (!mentor || mentor.status !== "APPROVED") throw notFound("Mentor not found.");

  const removed = await db.savedMentor.deleteMany({ where: { userId: actor.id, mentorProfileId } });
  if (removed.count > 0) return { saved: false };
  // skipDuplicates: a concurrent double-click already created it, and the end state is still "saved".
  await db.savedMentor.createMany({ data: [{ userId: actor.id, mentorProfileId }], skipDuplicates: true });
  return { saved: true };
}
