// Razorpay checkout: a paid booking is only ever confirmed by a verified payment.
import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as webhook } from "@/app/api/webhooks/razorpay/route";
import { confirmPayment, startCheckout, verifyBookingPayment } from "@/features/bookings/payments";
import { cancelBooking, createBooking, rescheduleBooking } from "@/features/bookings/service";
import { getAvailableSlots } from "@/features/bookings/slots";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { mentorProfileSchema } from "@/lib/validators";
import { actor, createMentor, createUser, offeredSlots, resetDb } from "./helpers/factories";

const KEY_ID = "rzp_test_unit";
const KEY_SECRET = "key-secret-for-tests";
const WEBHOOK_SECRET = "webhook-secret-for-tests";
const PRICE = 50_000; // ₹500

let orderSeq = 0;
const orderCalls: { amount: number; currency: string; receipt: string }[] = [];
let razorpayDown = false;

beforeEach(async () => {
  await resetDb();
  orderSeq = 0;
  orderCalls.length = 0;
  razorpayDown = false;
  process.env.NEXT_PUBLIC_PAYMENTS_MODE = "razorpay";
  const { env } = await import("@/lib/env");
  Object.assign(env, { RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      expect(String(url)).toBe("https://api.razorpay.com/v1/orders");
      expect((init.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`);
      if (razorpayDown) return new Response("boom", { status: 500 });
      const body = JSON.parse(String(init.body));
      orderCalls.push(body);
      return Response.json({ id: `order_${++orderSeq}`, amount: body.amount, currency: body.currency, status: "created", receipt: body.receipt });
    }),
  );
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_PAYMENTS_MODE;
  vi.unstubAllGlobals();
});

async function expectHttp(p: Promise<unknown>, status: number, message?: RegExp) {
  const err = await p.then(() => null, (e) => e);
  expect(err, "expected rejection").toBeInstanceOf(HttpError);
  expect((err as HttpError).status).toBe(status);
  if (message) expect((err as HttpError).message).toMatch(message);
}

const sign = (orderId: string, paymentId: string, secret = KEY_SECRET) => crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
const verifyBody = (orderId: string, paymentId = "pay_1", secret = KEY_SECRET) => ({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sign(orderId, paymentId, secret) });

function hook(body: unknown, secret = WEBHOOK_SECRET) {
  const raw = JSON.stringify(body);
  return webhook(new Request("http://x/api/webhooks/razorpay", { method: "POST", body: raw, headers: { "x-razorpay-signature": crypto.createHmac("sha256", secret).update(raw).digest("hex") } }));
}
const capturedEvent = (orderId: string, paymentId = "pay_1", amount = PRICE) => ({
  event: "payment.captured",
  payload: { payment: { entity: { id: paymentId, order_id: orderId, amount, currency: "INR", status: "captured" } } },
});

async function setup() {
  const { mentor, user: mentorUser } = await createMentor({ rateCents: PRICE });
  const student = await createUser();
  const [slot, slot2] = await offeredSlots(mentor);
  return { mentor, mentorUser, student, slot, slot2, me: actor(student) };
}
const bookPaid = async (s: Awaited<ReturnType<typeof setup>>, startsAt = s.slot.startsAt) =>
  createBooking(s.me, { mentorProfileId: s.mentor.id, startsAt, topic: "Resume review" });
const notifs = (userId: string) => db.notification.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });

describe("holding a slot for a paid session", () => {
  it("creates a PENDING, unpaid booking at the mentor's price, with no meeting link and no announcements yet", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    expect(b).toMatchObject({ status: "PENDING", paymentStatus: "PENDING", amountCents: PRICE, meetingUrl: null });
    expect(await notifs(s.mentorUser.id)).toHaveLength(0);
    expect(await notifs(s.student.id)).toHaveLength(0);
  });

  it("hides the held slot from other students, and frees it when the hold expires", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const offered = async () => (await getAvailableSlots({ ...s.mentor, days: 14 })).map((x) => x.startsAt);
    expect(await offered()).not.toContain(s.slot.startsAt);

    await db.booking.update({ where: { id: b.id }, data: { createdAt: new Date(Date.now() - 16 * 60_000) } });
    expect(await offered()).toContain(s.slot.startsAt);

    // Another student can really take it, and the abandoned hold is released.
    const other = await createUser();
    const taken = await createBooking(actor(other), { mentorProfileId: s.mentor.id, startsAt: s.slot.startsAt, topic: "Mine now" });
    expect(taken.status).toBe("PENDING");
    expect(await db.booking.findUniqueOrThrow({ where: { id: b.id } })).toMatchObject({ status: "CANCELLED", cancelReason: "Payment not completed in time" });
  });

  it("still confirms a free mentor instantly while payments are on", async () => {
    const { mentor } = await createMentor({ rateCents: 0 });
    const student = await createUser();
    const [slot] = await offeredSlots(mentor);
    const b = await createBooking(actor(student), { mentorProfileId: mentor.id, startsAt: slot.startsAt, topic: "Free chat" });
    expect(b).toMatchObject({ status: "CONFIRMED", paymentStatus: "NOT_REQUIRED", amountCents: 0 });
  });

  it("the database refuses a priced booking that is confirmed but unpaid", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    await expect(db.booking.update({ where: { id: b.id }, data: { status: "CONFIRMED" } })).rejects.toThrow();
  });
});

describe("opening checkout", () => {
  it("creates an order for the mentor's price (never client input) and returns what the browser needs", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const c = await startCheckout(s.me, b.id);
    expect(c).toMatchObject({ keyId: KEY_ID, orderId: "order_1", amount: PRICE, currency: "INR" });
    expect(orderCalls).toEqual([expect.objectContaining({ amount: PRICE, receipt: `bk_${b.id}` })]);
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).paymentIntentId).toBe("order_1");
    // No secret ever goes to the browser.
    expect(JSON.stringify(c)).not.toContain(KEY_SECRET);
  });

  it("reuses the same order if checkout is reopened", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    await startCheckout(s.me, b.id);
    const again = await startCheckout(s.me, b.id);
    expect(again.orderId).toBe("order_1");
    expect(orderCalls).toHaveLength(1);
  });

  it("releases the held slot if the order can't be created", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    razorpayDown = true;
    await expectHttp(startCheckout(s.me, b.id), 502);
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("CANCELLED");
    expect(await getAvailableSlots({ ...s.mentor, days: 14 }).then((x) => x.map((y) => y.startsAt))).toContain(s.slot.startsAt);
  });

  it("refuses an expired hold, someone else's booking, and a free booking", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    await expectHttp(startCheckout(actor(await createUser()), b.id), 404);
    await db.booking.update({ where: { id: b.id }, data: { createdAt: new Date(Date.now() - 16 * 60_000) } });
    await expectHttp(startCheckout(s.me, b.id), 409, /payment window/);

    const free = await createMentor();
    const [fs] = await offeredSlots(free.mentor);
    const fb = await createBooking(s.me, { mentorProfileId: free.mentor.id, startsAt: fs.startsAt, topic: "Free" });
    await expectHttp(startCheckout(s.me, fb.id), 409, /doesn't need a payment/);
  });
});

describe("confirming from the browser", () => {
  it("confirms only with a valid signature, then gives a meeting link and tells both people", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const { orderId } = await startCheckout(s.me, b.id);

    const done = await verifyBookingPayment(s.me, b.id, verifyBody(orderId));
    expect(done).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID", meetingKind: "INTERNAL_ROOM" });
    expect(done.meetingUrl).toMatch(/^https:\/\/meet\.jit\.si\/mentio-/);
    expect(await notifs(s.mentorUser.id)).toHaveLength(1);
    expect((await notifs(s.student.id))[0].title).toMatch(/Payment received/);
  });

  it("rejects a forged or wrongly-keyed signature and leaves the booking unpaid", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const { orderId } = await startCheckout(s.me, b.id);
    await expectHttp(verifyBookingPayment(s.me, b.id, verifyBody(orderId, "pay_1", "attacker-secret")), 400, /couldn't verify/);
    await expectHttp(verifyBookingPayment(s.me, b.id, { ...verifyBody(orderId), razorpay_signature: "00" }), 400);
    expect(await db.booking.findUniqueOrThrow({ where: { id: b.id } })).toMatchObject({ status: "PENDING", paymentStatus: "PENDING" });
  });

  it("rejects a real payment for a different order, and other users' bookings", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    await startCheckout(s.me, b.id);
    await expectHttp(verifyBookingPayment(s.me, b.id, verifyBody("order_other")), 422);
    await expectHttp(verifyBookingPayment(actor(await createUser()), b.id, verifyBody("order_1")), 404);
    await expectHttp(verifyBookingPayment(actor(s.mentorUser), b.id, verifyBody("order_1")), 403);
  });

  it("is idempotent", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const { orderId } = await startCheckout(s.me, b.id);
    await verifyBookingPayment(s.me, b.id, verifyBody(orderId));
    await verifyBookingPayment(s.me, b.id, verifyBody(orderId));
    expect(await notifs(s.mentorUser.id)).toHaveLength(1);
  });
});

describe("confirming from Razorpay's webhook", () => {
  it("rejects a missing or wrong signature", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const { orderId } = await startCheckout(s.me, b.id);
    expect((await hook(capturedEvent(orderId), "wrong")).status).toBe(401);
    expect((await webhook(new Request("http://x", { method: "POST", body: JSON.stringify(capturedEvent(orderId)) }))).status).toBe(401);
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("PENDING");
  });

  it("confirms when the tab was closed, and a replay changes nothing", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const { orderId } = await startCheckout(s.me, b.id);
    expect(await (await hook(capturedEvent(orderId))).json()).toEqual({ outcome: "confirmed" });
    expect(await (await hook(capturedEvent(orderId))).json()).toEqual({ outcome: "already_confirmed" });
    expect(await db.booking.findUniqueOrThrow({ where: { id: b.id } })).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
    expect(await notifs(s.mentorUser.id)).toHaveLength(1);
  });

  it("understands order.paid too", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const { orderId } = await startCheckout(s.me, b.id);
    const res = await hook({ event: "order.paid", payload: { payment: { entity: { id: "pay_9", order_id: orderId, amount: PRICE, currency: "INR" } }, order: { entity: { id: orderId } } } });
    expect(await res.json()).toEqual({ outcome: "confirmed" });
  });

  it("ignores an amount that doesn't match what we asked for", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const { orderId } = await startCheckout(s.me, b.id);
    expect(await (await hook(capturedEvent(orderId, "pay_1", 100))).json()).toEqual({ outcome: "amount_mismatch" });
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("PENDING");
  });

  it("acknowledges unrelated events and orders without touching anything", async () => {
    const s = await setup();
    await bookPaid(s);
    expect(await (await hook({ event: "payment.failed", payload: {} })).json()).toEqual({ ignored: "payment.failed" });
    expect(await (await hook(capturedEvent("order_not_ours"))).json()).toEqual({ outcome: "unknown_order" });
  });

  it("browser verify and webhook arriving together confirm exactly once", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const { orderId } = await startCheckout(s.me, b.id);
    await Promise.all([verifyBookingPayment(s.me, b.id, verifyBody(orderId)), hook(capturedEvent(orderId))]);
    expect(await notifs(s.mentorUser.id)).toHaveLength(1);
    expect(await db.booking.findUniqueOrThrow({ where: { id: b.id } })).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
  });
});

describe("paying after the hold expired", () => {
  const expire = (id: string) => db.booking.update({ where: { id }, data: { createdAt: new Date(Date.now() - 20 * 60_000) } });

  it("keeps the booking when nobody else took the slot", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const { orderId } = await startCheckout(s.me, b.id);
    await expire(b.id);
    // A later booking attempt sweeps the expired hold.
    await createBooking(actor(await createUser()), { mentorProfileId: s.mentor.id, startsAt: s.slot2.startsAt, topic: "Elsewhere" });
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("CANCELLED");

    expect(await (await hook(capturedEvent(orderId))).json()).toEqual({ outcome: "confirmed" });
    expect(await db.booking.findUniqueOrThrow({ where: { id: b.id } })).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID", cancelReason: null });
  });

  it("marks a refund due, and tells the student, when someone else took the slot", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const { orderId } = await startCheckout(s.me, b.id);
    await expire(b.id);
    const other = await createUser();
    const taken = await createBooking(actor(other), { mentorProfileId: s.mentor.id, startsAt: s.slot.startsAt, topic: "Faster" });
    const { orderId: otherOrder } = await startCheckout(actor(other), taken.id);
    await verifyBookingPayment(actor(other), taken.id, verifyBody(otherOrder, "pay_other"));

    await expectHttp(verifyBookingPayment(s.me, b.id, verifyBody(orderId)), 409, /refunded/);
    expect(await db.booking.findUniqueOrThrow({ where: { id: b.id } })).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUND_DUE" });
    expect((await notifs(s.student.id)).at(-1)?.title).toMatch(/refund/i);
    // The other student's confirmed booking is untouched.
    expect((await db.booking.findUniqueOrThrow({ where: { id: taken.id } })).status).toBe("CONFIRMED");
  });
});

describe("cancelling", () => {
  it("marks a paid booking REFUND_DUE", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const { orderId } = await startCheckout(s.me, b.id);
    await verifyBookingPayment(s.me, b.id, verifyBody(orderId));
    const cancelled = await cancelBooking(s.me, b.id, { reason: "Can't make it" });
    expect(cancelled).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUND_DUE" });
    // A late duplicate webhook must not resurrect it.
    expect(await (await hook(capturedEvent(orderId))).json()).toEqual({ outcome: "already_confirmed" });
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("CANCELLED");
  });

  it("an unpaid hold that is cancelled is not owed anything", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const cancelled = await cancelBooking(s.me, b.id, {});
    expect(cancelled).toMatchObject({ status: "CANCELLED", paymentStatus: "PENDING" });
  });
});

describe("rescheduling", () => {
  it("keeps a paid booking paid and confirmed at the new time, with no second charge", async () => {
    const s = await setup();
    const b = await bookPaid(s);
    const { orderId } = await startCheckout(s.me, b.id);
    await verifyBookingPayment(s.me, b.id, verifyBody(orderId));
    const moved = await rescheduleBooking(s.me, b.id, { startsAt: s.slot2.startsAt });
    expect(moved).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID", amountCents: PRICE, paymentIntentId: orderId });
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).paymentStatus).toBe("PAID");
    // A replayed webhook lands on the live booking, not the old one.
    expect(await (await hook(capturedEvent(orderId))).json()).toEqual({ outcome: "already_confirmed" });
    expect(orderCalls).toHaveLength(1);
  });
});

describe("confirmPayment safety", () => {
  it("never confirms an order that isn't one of ours", async () => {
    await setup();
    expect((await confirmPayment({ orderId: "order_x", paymentId: "p", paid: { amount: 1, currency: "INR" } })).outcome).toBe("unknown_order");
  });
});

describe("mentor pricing rules", () => {
  const base = {
    headline: "Senior engineer and mentor",
    bio: "I help students break into open source and land their first engineering roles.",
    experience: "Ten years building and shipping production software at scale.",
    categoryIds: ["c1"],
    verificationUrl: "https://github.com/someone",
  };
  it("allows free or ₹50–₹50,000 sessions when payments are on", () => {
    for (const rateCents of [0, 5_000, 50_000, 5_000_000]) expect(mentorProfileSchema.safeParse({ ...base, rateCents }).success).toBe(true);
    for (const rateCents of [1, 4_999, 5_000_001, -1, 100.5]) expect(mentorProfileSchema.safeParse({ ...base, rateCents }).success).toBe(false);
  });
  it("still refuses any price in the free beta", () => {
    process.env.NEXT_PUBLIC_PAYMENTS_MODE = "free_beta";
    expect(mentorProfileSchema.safeParse({ ...base, rateCents: 5_000 }).success).toBe(false);
    expect(mentorProfileSchema.safeParse({ ...base, rateCents: 0 }).success).toBe(true);
  });
});
