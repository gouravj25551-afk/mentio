"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { startOfDay } from "date-fns";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookingCancelSchema, bookingRescheduleSchema, bookingSchema, reviewSchema } from "@/lib/validators";
import { env } from "@/lib/env";
import { createNotificationSafely } from "@/features/notifications/service";
import { getAvailableSlots } from "@/features/bookings/slots";
import { calendarService } from "@/services/calendar";
import { sendEmailSafely } from "@/services/email/send";
import { absoluteUrl, bookingCancelledEmail, bookingConfirmedEmail, formatSessionTime } from "@/services/email/templates";

async function requireStudent() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return session.user;
}

const SLOT_TAKEN = "That slot was just taken. Try another.";

export async function createBooking(input: unknown) {
  const user = await requireStudent();
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

  const mentor = await db.mentorProfile.findUnique({
    where: { id: parsed.data.mentorProfileId },
    include: { user: true },
  });
  // Only approved mentors who are accepting bookings can be booked.
  if (!mentor || mentor.status !== "APPROVED" || !mentor.acceptingBookings) {
    throw new Error("This mentor is not accepting bookings right now.");
  }
  if (mentor.userId === user.id) throw new Error("You can't book your own session.");

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + mentor.sessionLength * 60_000);
  if (startsAt < new Date()) throw new Error("Pick a future time.");

  // The slot must be one the mentor actually offers (not just any future time).
  const offered = await getAvailableSlots({
    mentorProfileId: mentor.id,
    from: startOfDay(startsAt),
    days: 1,
    sessionLength: mentor.sessionLength,
  });
  if (!offered.some((s) => s.startsAt === startsAt.toISOString())) throw new Error(SLOT_TAKEN);

  const meetingUrl = await calendarService.createMeeting({
    mentorProfileId: mentor.id,
    studentId: user.id,
    startsAt,
    endsAt,
    topic: parsed.data.topic,
  });

  // Overlap check and insert share one serializable transaction so two students
  // can't claim the same slot concurrently.
  let booking;
  try {
    booking = await db.$transaction(
      async (tx) => {
        const overlap = await tx.booking.count({
          where: {
            mentorProfileId: mentor.id,
            status: { in: ["PENDING", "CONFIRMED"] },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        });
        if (overlap > 0) throw new Error(SLOT_TAKEN);
        return tx.booking.create({
          data: {
            studentId: user.id,
            mentorProfileId: mentor.id,
            startsAt,
            endsAt,
            topic: parsed.data.topic,
            notes: parsed.data.notes,
            // Checkout isn't live: nothing is charged, so the booking confirms immediately.
            amountCents: 0,
            currency: mentor.currency,
            status: "CONFIRMED",
            meetingUrl,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err) {
    // P2034 = serialization failure: a concurrent booking won the slot.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") throw new Error(SLOT_TAKEN);
    throw err;
  }

  // The booking is committed. Nothing below may fail the request.
  const student = await db.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } }).catch(() => null);
  const studentName = student?.name ?? user.name ?? null;
  await Promise.all([
    createNotificationSafely({
      userId: mentor.userId,
      type: "BOOKING_CREATED",
      title: `New booking from ${studentName ?? "a student"}`,
      body: `Topic: ${parsed.data.topic}`,
      link: `/dashboard/mentor/bookings/${booking.id}`,
    }),
    createNotificationSafely({
      userId: user.id,
      type: "BOOKING_CONFIRMED",
      title: `Booking with ${mentor.user.name ?? "your mentor"} confirmed`,
      body: `${formatSessionTime(startsAt)} — ${parsed.data.topic}`,
      link: `/dashboard/student/bookings/${booking.id}`,
    }),
    student?.email
      ? sendEmailSafely("booking confirmed (student)", {
          to: student.email,
          ...bookingConfirmedEmail({
            recipientName: studentName,
            otherPartyName: mentor.user.name,
            role: "student",
            startsAt,
            topic: parsed.data.topic,
            bookingUrl: absoluteUrl(env.NEXT_PUBLIC_APP_URL, `/dashboard/student/bookings/${booking.id}`),
          }),
        })
      : null,
    mentor.user.email
      ? sendEmailSafely("booking confirmed (mentor)", {
          to: mentor.user.email,
          ...bookingConfirmedEmail({
            recipientName: mentor.user.name,
            otherPartyName: studentName,
            role: "mentor",
            startsAt,
            topic: parsed.data.topic,
            bookingUrl: absoluteUrl(env.NEXT_PUBLIC_APP_URL, `/dashboard/mentor/bookings/${booking.id}`),
          }),
        })
      : null,
  ]);

  revalidatePath("/dashboard");
  return booking;
}

export async function cancelBooking(bookingId: string, input: unknown) {
  const user = await requireStudent();
  const parsed = bookingCancelSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { mentorProfile: { include: { user: true } }, student: true },
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.studentId !== user.id && booking.mentorProfile.userId !== user.id && user.role !== "ADMIN") {
    throw new Error("Not permitted");
  }
  if (booking.status === "CANCELLED") return booking;
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new Error("This session can no longer be cancelled.");
  }
  const updated = await db.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelReason: parsed.data.reason, cancelledAt: new Date() },
  });

  // The cancellation is committed. Nothing below may fail the request.
  const mentorUser = booking.mentorProfile.user;
  const emailFor = (to: string | null | undefined, recipientName: string | null, path: string) =>
    to
      ? sendEmailSafely("booking cancelled", {
          to,
          ...bookingCancelledEmail({
            recipientName,
            startsAt: booking.startsAt,
            topic: booking.topic,
            reason: parsed.data.reason,
            bookingUrl: absoluteUrl(env.NEXT_PUBLIC_APP_URL, path),
          }),
        })
      : null;
  await Promise.all([
    createNotificationSafely({
      userId: booking.studentId,
      type: "BOOKING_CANCELLED",
      title: "Your booking was cancelled",
      body: parsed.data.reason ?? undefined,
      link: `/dashboard/student/bookings/${booking.id}`,
    }),
    createNotificationSafely({
      userId: mentorUser.id,
      type: "BOOKING_CANCELLED",
      title: "A booking was cancelled",
      body: parsed.data.reason ?? undefined,
      link: `/dashboard/mentor/bookings/${booking.id}`,
    }),
    emailFor(booking.student.email, booking.student.name, `/dashboard/student/bookings/${booking.id}`),
    emailFor(mentorUser.email, mentorUser.name, `/dashboard/mentor/bookings/${booking.id}`),
  ]);
  revalidatePath("/dashboard");
  return updated;
}

export async function rescheduleBooking(bookingId: string, input: unknown) {
  const user = await requireStudent();
  const parsed = bookingRescheduleSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");

  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { mentorProfile: true } });
  if (!booking) throw new Error("Booking not found");
  if (booking.studentId !== user.id) throw new Error("Not permitted");
  if (booking.mentorProfile.status !== "APPROVED" || !booking.mentorProfile.acceptingBookings) {
    throw new Error("This mentor is not accepting bookings right now.");
  }
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") throw new Error("This session can't be rescheduled.");

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + booking.mentorProfile.sessionLength * 60_000);
  if (startsAt < new Date()) throw new Error("Pick a future time.");

  const overlap = await db.booking.count({
    where: {
      mentorProfileId: booking.mentorProfileId,
      status: { in: ["PENDING", "CONFIRMED"] },
      NOT: { id: bookingId },
      OR: [{ startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }],
    },
  });
  if (overlap > 0) throw new Error("That slot was just taken. Try another.");

  // Mark old as rescheduled, create a new linked booking
  const newBooking = await db.$transaction(async (tx) => {
    const next = await tx.booking.create({
      data: {
        studentId: booking.studentId,
        mentorProfileId: booking.mentorProfileId,
        startsAt,
        endsAt,
        topic: booking.topic,
        notes: booking.notes,
        amountCents: booking.amountCents,
        currency: booking.currency,
        status: booking.status,
        rescheduledFromId: booking.id,
        meetingUrl: booking.meetingUrl,
      },
    });
    await tx.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Rescheduled" } });
    return next;
  });

  await Promise.all([
    createNotificationSafely({
      userId: booking.studentId,
      type: "BOOKING_RESCHEDULED",
      title: "Booking rescheduled",
      body: `New time: ${startsAt.toLocaleString()}`,
      link: `/dashboard/student/bookings/${newBooking.id}`,
    }),
    createNotificationSafely({
      userId: booking.mentorProfile.userId,
      type: "BOOKING_RESCHEDULED",
      title: "A booking was rescheduled",
      body: `New time: ${startsAt.toLocaleString()}`,
      link: `/dashboard/mentor/bookings/${newBooking.id}`,
    }),
  ]);
  revalidatePath("/dashboard");
  return newBooking;
}

export async function leaveReview(input: unknown) {
  const user = await requireStudent();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");

  const booking = await db.booking.findUnique({ where: { id: parsed.data.bookingId }, include: { mentorProfile: true } });
  if (!booking) throw new Error("Booking not found");
  if (booking.studentId !== user.id) throw new Error("Not permitted");
  if (booking.status !== "COMPLETED") throw new Error("Only completed sessions can be reviewed.");

  const review = await db.review.upsert({
    where: { bookingId: booking.id },
    update: { rating: parsed.data.rating, comment: parsed.data.comment },
    create: {
      bookingId: booking.id,
      mentorProfileId: booking.mentorProfileId,
      authorId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  // Recompute mentor rating
  const agg = await db.review.aggregate({
    where: { mentorProfileId: booking.mentorProfileId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await db.mentorProfile.update({
    where: { id: booking.mentorProfileId },
    data: {
      averageRating: agg._avg.rating ?? 0,
      totalReviews: agg._count.rating ?? 0,
    },
  });

  await createNotificationSafely({
    userId: booking.mentorProfile.userId,
    type: "REVIEW_LEFT",
    title: `New ${parsed.data.rating}★ review`,
    body: parsed.data.comment,
    link: `/dashboard/mentor/reviews`,
  });

  revalidatePath("/dashboard");
  return review;
}

export async function toggleSave(mentorProfileId: string) {
  const user = await requireStudent();
  const existing = await db.savedMentor.findUnique({
    where: { userId_mentorProfileId: { userId: user.id, mentorProfileId } },
  });
  if (existing) {
    await db.savedMentor.delete({ where: { id: existing.id } });
    return { saved: false };
  }
  await db.savedMentor.create({ data: { userId: user.id, mentorProfileId } });
  return { saved: true };
}
