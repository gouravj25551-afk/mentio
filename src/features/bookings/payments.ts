// Paid-booking logic: opening checkout and turning a verified payment into a confirmed booking.
// Money only ever moves in Razorpay. Here we (1) create the order, (2) trust nothing
// from the browser except an HMAC-verified signature, and (3) confirm exactly once.
import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Booking } from "@prisma/client";

import { db } from "@/lib/db";
import { PAYMENT } from "@/lib/booking-rules";
import { conflict, forbidden, HttpError, notFound } from "@/lib/errors";
import { logError } from "@/lib/log";
import { formatInZone, safeTimezone } from "@/lib/time";
import { paymentsEnabled } from "@/lib/pricing";
import type { CurrentUser } from "@/lib/auth/guards";
import { notifySafely } from "@/features/notifications/service";
import { assertNoOverlap, HOLD_EXPIRED_REASON, lockMentorAndStudent } from "@/features/bookings/service";
import { resolveMeeting } from "@/services/calendar";
import { CHECKOUT_TIMEOUT_SECONDS, HOLD_MINUTES, holdCutoff } from "@/services/payments";
import { createOrder, razorpayKeyId, verifyCheckoutSignature } from "@/services/payments/razorpay";

export type Checkout = {
  keyId: string;
  orderId: string;
  /** Paise. */
  amount: number;
  currency: string;
  description: string;
  prefill: { name: string; email: string };
  timeoutSeconds: number;
  /** ISO time after which the held slot is released. */
  holdExpiresAt: string;
};

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

async function loadOwnPending(actor: CurrentUser, bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { mentorProfile: { select: { user: { select: { name: true } } } } },
  });
  // Someone else's booking looks the same as a missing one.
  if (!booking || booking.studentId !== actor.id) throw notFound("Booking not found.");
  return booking;
}

/** Cancels a hold that never got as far as a payable order. */
async function dropHold(bookingId: string) {
  await db.booking
    .updateMany({
      where: { id: bookingId, status: "PENDING", paymentStatus: PAYMENT.PENDING },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Payment could not be started" },
    })
    .catch((err) => logError("payment.drop_hold_failed", err));
}

/**
 * Creates (or reuses) the Razorpay order for a held booking and returns what the browser
 * needs to open checkout. The amount is the price saved on the booking, never client input.
 */
export async function startCheckout(actor: CurrentUser, bookingId: string): Promise<Checkout> {
  if (!paymentsEnabled()) throw new HttpError(402, "Paid sessions aren't available yet.");
  const booking = await loadOwnPending(actor, bookingId);
  if (booking.status !== "PENDING" || booking.paymentStatus !== PAYMENT.PENDING || booking.amountCents <= 0) {
    throw conflict("This booking doesn't need a payment.");
  }
  if (booking.createdAt < holdCutoff()) throw conflict("The payment window for this time has closed. Please pick a time again.");

  let orderId = booking.paymentIntentId;
  if (!orderId) {
    try {
      const order = await createOrder({
        amount: booking.amountCents,
        currency: booking.currency,
        receipt: `bk_${booking.id}`,
        notes: { bookingId: booking.id, studentId: booking.studentId, mentorProfileId: booking.mentorProfileId },
      });
      // Two tabs can race here: only the first order is kept.
      const saved = await db.booking.updateMany({ where: { id: booking.id, paymentIntentId: null }, data: { paymentIntentId: order.id } });
      orderId = saved.count === 1 ? order.id : (await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).paymentIntentId;
    } catch (err) {
      // Leave no held slot behind if checkout can't even start.
      await dropHold(booking.id);
      throw err;
    }
  }
  if (!orderId) throw new HttpError(502, "Couldn't start the payment. Please try again.");

  return {
    keyId: razorpayKeyId(),
    orderId,
    amount: booking.amountCents,
    currency: booking.currency,
    description: `1:1 session with ${booking.mentorProfile.user.name ?? "your mentor"}`,
    prefill: { name: actor.name ?? "", email: actor.email },
    timeoutSeconds: CHECKOUT_TIMEOUT_SECONDS,
    holdExpiresAt: new Date(booking.createdAt.getTime() + HOLD_MINUTES * 60_000).toISOString(),
  };
}

export type ConfirmOutcome = "confirmed" | "already_confirmed" | "unknown_order" | "amount_mismatch" | "refund_due";

/**
 * Turns a verified payment into a confirmed booking. Safe to call any number of times, from
 * the browser verify route and from the webhook at once: only one call changes anything.
 * `paid` is what Razorpay says was paid; it must equal what we asked for.
 */
export async function confirmPayment(input: { orderId: string; paymentId: string; paid: { amount: number; currency: string } }): Promise<{ outcome: ConfirmOutcome; booking?: Booking }> {
  const found = await db.booking.findFirst({ where: { paymentIntentId: input.orderId }, orderBy: { createdAt: "desc" } });
  // An order from some other product on the same Razorpay account: not ours to touch.
  if (!found) return { outcome: "unknown_order" };

  if (input.paid.amount !== found.amountCents || input.paid.currency !== found.currency) {
    logError("payment.amount_mismatch", new Error(`booking ${found.id}: expected ${found.amountCents} ${found.currency}, got ${input.paid.amount} ${input.paid.currency}`));
    return { outcome: "amount_mismatch" };
  }

  const result = await db.$transaction(
    async (tx) => {
      await lockMentorAndStudent(tx, found.mentorProfileId, found.studentId);
      const booking = await tx.booking.findUniqueOrThrow({ where: { id: found.id }, include: { mentorProfile: true } });
      if (booking.paymentStatus === PAYMENT.PAID || booking.paymentStatus === PAYMENT.REFUND_DUE || booking.paymentStatus === PAYMENT.REFUNDED) {
        return { outcome: "already_confirmed" as const, booking };
      }

      const confirm = async () => {
        const meeting = resolveMeeting(booking.mentorProfile);
        const updated = await tx.booking.update({
          where: { id: booking.id },
          data: { status: "CONFIRMED", paymentStatus: PAYMENT.PAID, cancelledAt: null, cancelReason: null, meetingUrl: meeting.url, meetingKind: meeting.kind },
        });
        return { outcome: "confirmed" as const, booking: updated };
      };
      const refundDue = async () => ({
        outcome: "refund_due" as const,
        booking: await tx.booking.update({ where: { id: booking.id }, data: { paymentStatus: PAYMENT.REFUND_DUE } }),
      });

      if (booking.status === "PENDING") return confirm();

      // The hold expired before the money arrived. If nobody took the slot meanwhile the
      // student keeps it; otherwise they are owed a refund. Never silently keep both.
      if (booking.status === "CANCELLED" && booking.cancelReason === HOLD_EXPIRED_REASON && booking.startsAt > new Date()) {
        let slotFree = true;
        try {
          await assertNoOverlap(tx, { mentorProfileId: booking.mentorProfileId, studentId: booking.studentId, startsAt: booking.startsAt, endsAt: booking.endsAt, ignoreBookingId: booking.id });
        } catch (err) {
          if (!(err instanceof HttpError)) throw err;
          slotFree = false;
        }
        return slotFree ? confirm() : refundDue();
      }
      return refundDue();
    },
    { maxWait: 5_000, timeout: 10_000 },
  ).catch(async (err) => {
    // A failed insert aborts the transaction; surface the refund path instead of a 500.
    if (err instanceof Error && (err.message.includes("Booking_no_overlap") || err.message.includes("23P01"))) {
      return { outcome: "refund_due" as const, booking: await db.booking.update({ where: { id: found.id }, data: { paymentStatus: PAYMENT.REFUND_DUE } }) };
    }
    throw err;
  });

  if (result.outcome === "confirmed" || result.outcome === "refund_due") {
    await announce(result.outcome, result.booking);
    revalidatePath("/dashboard", "layout");
  }
  return result;
}

async function announce(outcome: "confirmed" | "refund_due", booking: Booking) {
  const mentor = await db.mentorProfile.findUnique({ where: { id: booking.mentorProfileId }, select: { userId: true, timezone: true, user: { select: { name: true } } } });
  if (!mentor) return;
  if (outcome === "refund_due") {
    logError("payment.refund_due", new Error(`booking ${booking.id} was paid but can't be kept; refund ${booking.amountCents} ${booking.currency} (order ${booking.paymentIntentId})`));
    await notifySafely({
      userId: booking.studentId,
      type: "SYSTEM",
      title: "Your payment needs a refund",
      body: "We received your payment, but that time is no longer available. You'll be refunded; pick another time any time.",
      link: `/dashboard/student/bookings/${booking.id}`,
    });
    return;
  }
  const student = await db.profile.findUnique({ where: { userId: booking.studentId }, select: { timezone: true } });
  const studentUser = await db.user.findUnique({ where: { id: booking.studentId }, select: { name: true } });
  await Promise.all([
    notifySafely({
      userId: mentor.userId,
      type: "BOOKING_CREATED",
      title: `New booking from ${studentUser?.name ?? "a student"}`,
      body: `${formatInZone(booking.startsAt, safeTimezone(mentor.timezone))} — ${booking.topic}`,
      link: `/dashboard/mentor/bookings/${booking.id}`,
    }),
    notifySafely({
      userId: booking.studentId,
      type: "BOOKING_CONFIRMED",
      title: `Payment received. Booking with ${mentor.user.name ?? "your mentor"} confirmed`,
      body: `${formatInZone(booking.startsAt, safeTimezone(student?.timezone))} — ${booking.topic}`,
      link: `/dashboard/student/bookings/${booking.id}`,
    }),
  ]);
}

/** The browser reports a finished payment; accept it only if Razorpay's signature checks out. */
export async function verifyBookingPayment(actor: CurrentUser, bookingId: string, input: unknown): Promise<Booking> {
  if (actor.role !== "STUDENT") throw forbidden("Only students can pay for sessions.");
  const body = verifySchema.parse(input);
  const booking = await loadOwnPending(actor, bookingId);
  if (!booking.paymentIntentId || booking.paymentIntentId !== body.razorpay_order_id) {
    throw new HttpError(422, "That payment doesn't belong to this booking.");
  }
  const ok = verifyCheckoutSignature({ orderId: body.razorpay_order_id, paymentId: body.razorpay_payment_id, signature: body.razorpay_signature });
  if (!ok) throw new HttpError(400, "We couldn't verify that payment. If money left your account it will be refunded automatically.");

  // The signature binds this order to a captured payment, and the order's amount is ours.
  const { outcome, booking: updated } = await confirmPayment({
    orderId: body.razorpay_order_id,
    paymentId: body.razorpay_payment_id,
    paid: { amount: booking.amountCents, currency: booking.currency },
  });
  if (outcome === "refund_due") throw conflict("That time was taken while your payment was processing. You'll be refunded; please pick another time.");
  return updated ?? booking;
}
