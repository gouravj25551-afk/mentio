import { beforeEach, describe, expect, it } from "vitest";

import {
  cancelBooking,
  completeBooking,
  createBooking,
  leaveReview,
  rescheduleBooking,
  toggleSave,
} from "@/features/bookings/service";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { actor, createMentor, createUser, insertBooking, inHours, offeredSlots, resetDb } from "./helpers/factories";

const book = (student: Awaited<ReturnType<typeof createUser>>, mentorProfileId: string, startsAt: string, topic = "Resume review") =>
  createBooking(actor(student), { mentorProfileId, startsAt, topic });

async function expectHttp(promise: Promise<unknown>, status: number, message?: RegExp) {
  const err = await promise.then(
    () => null,
    (e) => e,
  );
  expect(err, "expected the call to be rejected").toBeInstanceOf(HttpError);
  expect((err as HttpError).status).toBe(status);
  if (message) expect((err as HttpError).message).toMatch(message);
}

beforeEach(async () => {
  await resetDb();
});

describe("successful booking", () => {
  it("confirms a free session with a real meeting link and notifies both people", async () => {
    const { mentor, user: mentorUser } = await createMentor();
    const student = await createUser();
    const [slot] = await offeredSlots(mentor);

    const booking = await book(student, mentor.id, slot.startsAt);

    expect(booking).toMatchObject({
      status: "CONFIRMED",
      paymentStatus: "NOT_REQUIRED",
      amountCents: 0,
      meetingKind: "INTERNAL_ROOM",
      studentId: student.id,
    });
    expect(booking.startsAt.toISOString()).toBe(slot.startsAt);
    expect(booking.endsAt.toISOString()).toBe(slot.endsAt);
    // Unguessable generated room on a real service, not a made-up domain.
    expect(booking.meetingUrl).toMatch(/^https:\/\/meet\.jit\.si\/mentio-[0-9a-f]{24}$/);

    const notes = await db.notification.findMany({ orderBy: { createdAt: "asc" } });
    expect(notes.map((n) => n.userId).sort()).toEqual([mentorUser.id, student.id].sort());
    expect(notes.find((n) => n.userId === mentorUser.id)?.type).toBe("BOOKING_CREATED");
    expect(notes.find((n) => n.userId === student.id)?.type).toBe("BOOKING_CONFIRMED");
  });

  it("uses the mentor's own meeting link when they set one, and labels it as theirs", async () => {
    const { mentor } = await createMentor();
    await db.mentorProfile.update({ where: { id: mentor.id }, data: { meetingLink: "https://zoom.us/j/123456789" } });
    const student = await createUser();
    const [slot] = await offeredSlots({ ...mentor });
    const booking = await book(student, mentor.id, slot.startsAt);
    expect(booking.meetingUrl).toBe("https://zoom.us/j/123456789");
    expect(booking.meetingKind).toBe("EXTERNAL_LINK");
  });
});

describe("booking rules", () => {
  it.each(["PENDING", "REJECTED", "SUSPENDED"] as const)("cannot book a %s mentor", async (status) => {
    const { mentor } = await createMentor({ status });
    const student = await createUser();
    const slots = await db.availability.count({ where: { mentorProfileId: mentor.id } });
    expect(slots).toBeGreaterThan(0);
    await expectHttp(book(student, mentor.id, inHours(5).toISOString().replace(/:\d\d\.\d+Z$/, ":00.000Z")), 404);
    expect(await db.booking.count()).toBe(0);
  });

  it("cannot book a mentor who stopped accepting bookings", async () => {
    const { mentor } = await createMentor();
    const [slot] = await offeredSlots(mentor);
    await db.mentorProfile.update({ where: { id: mentor.id }, data: { acceptingBookings: false } });
    await expectHttp(book(await createUser(), mentor.id, slot.startsAt), 409, /accepting/);
  });

  it("rejects past times, too-short notice and far-future times", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    await expectHttp(book(student, mentor.id, "2020-01-06T10:00:00.000Z"), 422, /hour from now/);
    const soon = new Date(Math.ceil(Date.now() / 1_800_000) * 1_800_000 + 1_800_000);
    await expectHttp(book(student, mentor.id, soon.toISOString()), 422, /hour from now/);
    await expectHttp(book(student, mentor.id, inHours(24 * 90).toISOString()), 422, /60 days/);
    expect(await db.booking.count()).toBe(0);
  });

  it("rejects times outside the mentor's availability or off the session grid", async () => {
    const { mentor } = await createMentor({ windows: [{ weekday: "MON", startMinutes: 540, endMinutes: 600 }] });
    const student = await createUser();
    const [slot] = await offeredSlots(mentor, 1);
    const real = new Date(slot.startsAt);
    // 7 minutes off the grid
    await expectHttp(book(student, mentor.id, new Date(real.getTime() + 7 * 60_000).toISOString()), 409, /availability/);
    // a day later is a Tuesday: no window
    await expectHttp(book(student, mentor.id, new Date(real.getTime() + 86_400_000).toISOString()), 409, /availability/);
  });

  it("only students can book; mentors cannot book themselves", async () => {
    const { mentor, user: mentorUser } = await createMentor();
    const [slot] = await offeredSlots(mentor);
    const admin = await createUser({ role: "ADMIN" });
    await expectHttp(createBooking(actor(mentorUser), { mentorProfileId: mentor.id, startsAt: slot.startsAt, topic: "Hi" }), 403);
    await expectHttp(createBooking(actor(admin), { mentorProfileId: mentor.id, startsAt: slot.startsAt, topic: "Hi" }), 403);
    expect(await db.booking.count()).toBe(0);
  });

  it("validates input", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    await expect(createBooking(actor(student), { mentorProfileId: mentor.id, startsAt: "tomorrow", topic: "x" })).rejects.toThrow();
    await expect(createBooking(actor(student), { startsAt: new Date().toISOString() })).rejects.toThrow();
    await expect(createBooking(actor(student), null)).rejects.toThrow();
  });

  it("a student cannot be in two sessions at once", async () => {
    const a = await createMentor();
    const b = await createMentor();
    const student = await createUser();
    const [slot] = await offeredSlots(a.mentor);
    await book(student, a.mentor.id, slot.startsAt);
    await expectHttp(book(student, b.mentor.id, slot.startsAt), 409, /already have a session/);
  });
});

describe("payments (free beta)", () => {
  it("refuses a paid mentor instead of pretending the booking is paid", async () => {
    const { mentor } = await createMentor({ rateCents: 5000 });
    const student = await createUser();
    const [slot] = await offeredSlots({ ...mentor });
    await expectHttp(book(student, mentor.id, slot.startsAt), 402, /aren't available yet/);
    expect(await db.booking.count()).toBe(0);
  });

  it("the database itself rejects a priced booking that is confirmed but unpaid", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    const start = inHours(48);
    const insert = (paymentStatus: string | null, status: "CONFIRMED" | "PENDING") =>
      db.booking.create({
        data: {
          studentId: student.id, mentorProfileId: mentor.id, startsAt: start, endsAt: new Date(start.getTime() + 1_800_000),
          topic: "t", amountCents: 5000, status, paymentStatus,
        },
      });
    await expect(insert("PENDING", "CONFIRMED")).rejects.toThrow(/paid_before_confirmed/);
    await expect(insert(null, "CONFIRMED")).rejects.toThrow(/paid_before_confirmed/);
    await expect(insert("PENDING", "PENDING")).resolves.toBeTruthy(); // awaiting payment is fine
    await db.booking.deleteMany();
    await expect(insert("PAID", "CONFIRMED")).resolves.toBeTruthy();
  });

  it("a mentor cannot set a price during the beta", async () => {
    const { mentorProfileSchema } = await import("@/lib/validators");
    const base = {
      headline: "Senior engineer and mentor", bio: "x".repeat(50), experience: "y".repeat(30),
      categoryIds: ["c1"], timezone: "UTC",
    };
    expect(mentorProfileSchema.safeParse({ ...base, rateCents: 0 }).success).toBe(true);
    expect(mentorProfileSchema.safeParse({ ...base, rateCents: 5000 }).success).toBe(false);
  });
});

describe("double-booking prevention", () => {
  it("12 simultaneous requests for one slot produce exactly one booking", async () => {
    const { mentor } = await createMentor();
    const [slot] = await offeredSlots(mentor);
    const students = await Promise.all(Array.from({ length: 12 }, () => createUser()));

    const results = await Promise.allSettled(students.map((s) => book(s, mentor.id, slot.startsAt)));

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results.filter((r) => r.status === "rejected")) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(HttpError);
      expect(((r as PromiseRejectedResult).reason as HttpError).status).toBe(409);
    }
    expect(await db.booking.count({ where: { mentorProfileId: mentor.id, status: "CONFIRMED" } })).toBe(1);
  });

  it("the database exclusion constraint blocks overlaps even if app checks are bypassed", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    const other = await createUser();
    const start = inHours(48);
    await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: start });
    // 15 minutes into the existing session
    await expect(
      insertBooking({ studentId: other.id, mentorProfileId: mentor.id, startsAt: new Date(start.getTime() + 15 * 60_000) }),
    ).rejects.toThrow(/Booking_no_overlap/);
    // back-to-back is fine
    await expect(
      insertBooking({ studentId: other.id, mentorProfileId: mentor.id, startsAt: new Date(start.getTime() + 30 * 60_000) }),
    ).resolves.toBeTruthy();
    // a cancelled booking frees its time
    await db.booking.updateMany({ data: { status: "CANCELLED" } });
    await expect(insertBooking({ studentId: other.id, mentorProfileId: mentor.id, startsAt: start })).resolves.toBeTruthy();
  });
});

describe("cancellation", () => {
  it("frees the slot so someone else can book it, and notifies the other person", async () => {
    const { mentor, user: mentorUser } = await createMentor();
    const alice = await createUser();
    const bob = await createUser();
    const [slot] = await offeredSlots(mentor);
    const booking = await book(alice, mentor.id, slot.startsAt);
    await db.notification.deleteMany();

    const cancelled = await cancelBooking(actor(alice), booking.id, { reason: "Exam moved" });
    expect(cancelled).toMatchObject({ status: "CANCELLED", cancelReason: "Exam moved" });

    // The slot is offered again and bookable by a different student.
    const again = await offeredSlots(mentor, 1);
    expect(again[0].startsAt).toBe(slot.startsAt);
    await expect(book(bob, mentor.id, slot.startsAt)).resolves.toMatchObject({ status: "CONFIRMED" });

    const notes = await db.notification.findMany({ where: { type: "BOOKING_CANCELLED" } });
    expect(notes).toHaveLength(1); // only the mentor; the person who cancelled isn't notified
    expect(notes[0].userId).toBe(mentorUser.id);
    expect(notes[0].body).toMatch(/Cancelled by the student/);
  });

  it("the mentor can cancel too, and the student is notified", async () => {
    const { mentor, user: mentorUser } = await createMentor();
    const student = await createUser();
    const [slot] = await offeredSlots(mentor);
    const booking = await book(student, mentor.id, slot.startsAt);
    await db.notification.deleteMany();
    await cancelBooking(actor(mentorUser), booking.id, {});
    const notes = await db.notification.findMany();
    expect(notes.map((n) => n.userId)).toEqual([student.id]);
  });

  it("strangers get 'not found' (no existence leak); admins may cancel", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    const stranger = await createUser();
    const otherMentor = await createMentor();
    const admin = await createUser({ role: "ADMIN" });
    const [slot] = await offeredSlots(mentor);
    const booking = await book(student, mentor.id, slot.startsAt);

    await expectHttp(cancelBooking(actor(stranger), booking.id, {}), 404);
    await expectHttp(cancelBooking(actor(otherMentor.user), booking.id, {}), 404);
    await expectHttp(cancelBooking(actor(stranger), "does-not-exist", {}), 404);
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("CONFIRMED");

    await expect(cancelBooking(actor(admin), booking.id, {})).resolves.toMatchObject({ status: "CANCELLED" });
  });

  it("cannot cancel a session that already started, or one that is completed", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    const started = await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: new Date(Date.now() - 10 * 60_000) });
    await expectHttp(cancelBooking(actor(student), started.id, {}), 409, /already started/);
    const done = await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: inHours(-5), status: "COMPLETED" });
    await expectHttp(cancelBooking(actor(student), done.id, {}), 409, /no longer be cancelled/);
  });

  it("cancelling twice is harmless", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    const [slot] = await offeredSlots(mentor);
    const booking = await book(student, mentor.id, slot.startsAt);
    await cancelBooking(actor(student), booking.id, {});
    await db.notification.deleteMany();
    await expect(cancelBooking(actor(student), booking.id, {})).resolves.toMatchObject({ status: "CANCELLED" });
    expect(await db.notification.count()).toBe(0);
  });
});

describe("rescheduling", () => {
  it("moves the booking, frees the original slot, and links old to new", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    const other = await createUser();
    const [first, , third] = await offeredSlots(mentor, 3);
    const original = await book(student, mentor.id, first.startsAt);

    const moved = await rescheduleBooking(actor(student), original.id, { startsAt: third.startsAt });

    expect(moved).toMatchObject({ status: "CONFIRMED", rescheduledFromId: original.id, meetingUrl: original.meetingUrl });
    expect(moved.startsAt.toISOString()).toBe(third.startsAt);
    expect((await db.booking.findUniqueOrThrow({ where: { id: original.id } })).status).toBe("CANCELLED");
    // The original time can now be booked by someone else; the new one cannot.
    await expect(book(other, mentor.id, first.startsAt)).resolves.toBeTruthy();
    const noClash = await createUser();
    await expectHttp(book(noClash, mentor.id, third.startsAt), 409);
  });

  it("failing to reschedule leaves the original booking untouched", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    const other = await createUser();
    const [first, second] = await offeredSlots(mentor, 2);
    const original = await book(student, mentor.id, first.startsAt);
    await book(other, mentor.id, second.startsAt);

    await expectHttp(rescheduleBooking(actor(student), original.id, { startsAt: second.startsAt }), 409);
    await expectHttp(rescheduleBooking(actor(student), original.id, { startsAt: "2020-01-01T10:00:00.000Z" }), 422);
    const after = await db.booking.findUniqueOrThrow({ where: { id: original.id } });
    expect(after.status).toBe("CONFIRMED");
    expect(await db.booking.count({ where: { studentId: student.id } })).toBe(1);
  });

  it("only the student who booked can reschedule", async () => {
    const { mentor, user: mentorUser } = await createMentor();
    const student = await createUser();
    const stranger = await createUser();
    const [first, second] = await offeredSlots(mentor, 2);
    const booking = await book(student, mentor.id, first.startsAt);
    await expectHttp(rescheduleBooking(actor(stranger), booking.id, { startsAt: second.startsAt }), 404);
    await expectHttp(rescheduleBooking(actor(mentorUser), booking.id, { startsAt: second.startsAt }), 403);
  });

  it("cannot reschedule a cancelled booking or one that has started", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    const [first, second] = await offeredSlots(mentor, 2);
    const booking = await book(student, mentor.id, first.startsAt);
    await cancelBooking(actor(student), booking.id, {});
    await expectHttp(rescheduleBooking(actor(student), booking.id, { startsAt: second.startsAt }), 409);
    const started = await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: new Date(Date.now() - 600_000) });
    await expectHttp(rescheduleBooking(actor(student), started.id, { startsAt: second.startsAt }), 409, /already started/);
  });

  it("two people racing for one slot (a booking and a reschedule): exactly one wins", async () => {
    const { mentor } = await createMentor();
    const alice = await createUser();
    const bob = await createUser();
    const [first, , target] = await offeredSlots(mentor, 3);
    const aliceBooking = await book(alice, mentor.id, first.startsAt);

    const results = await Promise.allSettled([
      rescheduleBooking(actor(alice), aliceBooking.id, { startsAt: target.startsAt }),
      book(bob, mentor.id, target.startsAt),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.booking.count({ where: { mentorProfileId: mentor.id, status: "CONFIRMED", startsAt: new Date(target.startsAt) } })).toBe(1);
  });
});

describe("completing sessions and reviews", () => {
  it("only the mentor can finish a session, and only after it ended", async () => {
    const { mentor, user: mentorUser } = await createMentor();
    const student = await createUser();
    const stranger = await createUser();
    const [slot] = await offeredSlots(mentor);
    const future = await book(student, mentor.id, slot.startsAt);
    await expectHttp(completeBooking(actor(mentorUser), future.id, {}), 409, /hasn't ended/);

    const ended = await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: inHours(-3) });
    await expectHttp(completeBooking(actor(student), ended.id, {}), 403);
    await expectHttp(completeBooking(actor(stranger), ended.id, {}), 404);

    await expect(completeBooking(actor(mentorUser), ended.id, {})).resolves.toMatchObject({ status: "COMPLETED" });
    expect((await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } })).totalSessions).toBe(1);
    // Can't complete twice or flip to cancelled afterwards.
    await expectHttp(completeBooking(actor(mentorUser), ended.id, {}), 409);
  });

  it("a student reviews only their own completed session, once, and the rating updates", async () => {
    const { mentor, user: mentorUser } = await createMentor();
    const student = await createUser();
    const stranger = await createUser();
    const ended = await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: inHours(-3) });

    // Not completed yet
    await expectHttp(leaveReview(actor(student), { bookingId: ended.id, rating: 5 }), 409, /completed/);
    await completeBooking(actor(mentorUser), ended.id, {});

    await expectHttp(leaveReview(actor(stranger), { bookingId: ended.id, rating: 1 }), 404);
    await expectHttp(leaveReview(actor(mentorUser), { bookingId: ended.id, rating: 5 }), 403);
    await expect(leaveReview(actor(student), { bookingId: ended.id, rating: 9 })).rejects.toThrow();

    await leaveReview(actor(student), { bookingId: ended.id, rating: 4, comment: "Great" });
    let m = await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } });
    expect([m.averageRating, m.totalReviews]).toEqual([4, 1]);

    // Editing replaces, never duplicates.
    await leaveReview(actor(student), { bookingId: ended.id, rating: 2 });
    m = await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } });
    expect([m.averageRating, m.totalReviews]).toEqual([2, 1]);
    expect(await db.review.count()).toBe(1);
    // The mentor was notified once (on creation), not on edit.
    expect(await db.notification.count({ where: { type: "REVIEW_LEFT" } })).toBe(1);
  });

  it("cancelled and no-show sessions cannot be reviewed", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    const cancelled = await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: inHours(-3), status: "CANCELLED" });
    const noShow = await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: inHours(-6), status: "NO_SHOW" });
    await expectHttp(leaveReview(actor(student), { bookingId: cancelled.id, rating: 5 }), 409);
    await expectHttp(leaveReview(actor(student), { bookingId: noShow.id, rating: 5 }), 409);
  });
});

describe("saved mentors", () => {
  it("toggles, only for students, only for approved mentors", async () => {
    const { mentor } = await createMentor();
    const pending = await createMentor({ status: "PENDING" });
    const student = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    expect(await toggleSave(actor(student), { mentorProfileId: mentor.id })).toEqual({ saved: true });
    expect(await toggleSave(actor(student), { mentorProfileId: mentor.id })).toEqual({ saved: false });
    await expectHttp(toggleSave(actor(admin), { mentorProfileId: mentor.id }), 403);
    await expectHttp(toggleSave(actor(student), { mentorProfileId: pending.mentor.id }), 404);
    await expectHttp(toggleSave(actor(student), { mentorProfileId: "nope" }), 404);
  });

  it("rapid double-clicks never error and end in a consistent state", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => toggleSave(actor(student), { mentorProfileId: mentor.id })));
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await db.savedMentor.count({ where: { userId: student.id } })).toBeLessThanOrEqual(1);
  });
});
