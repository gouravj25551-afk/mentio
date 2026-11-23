// Payments.
//
// Two modes (NEXT_PUBLIC_PAYMENTS_MODE):
//  - free_beta (default): every session is free; a priced booking is refused.
//  - razorpay: students pay at checkout and the money settles to the Razorpay
//    account that owns RAZORPAY_KEY_ID. Mentor payouts are NOT automatic.
//
// A paid booking's life:
//  1. createBooking holds the slot as PENDING / paymentStatus PENDING, no meeting link yet.
//  2. startCheckout creates a Razorpay order (amount from the mentor's profile, never the client).
//  3. The browser pays; the booking confirms ONLY after a verified signature
//     (POST /api/bookings/:id/payment/verify) or a verified webhook, whichever arrives first.
//  4. An unpaid hold expires after HOLD_MINUTES and frees the slot.
// Booking_paid_before_confirmed_check rejects a priced CONFIRMED booking that isn't PAID.
import { paymentsEnabled } from "@/lib/pricing";
import { HttpError } from "@/lib/errors";

export const HOLD_MINUTES = 15;
/** Razorpay's checkout modal closes itself after this long, comfortably inside the hold. */
export const CHECKOUT_TIMEOUT_SECONDS = 10 * 60;

export const holdCutoff = (now = new Date()) => new Date(now.getTime() - HOLD_MINUTES * 60_000);

/** Throws unless the session is free or payments are on. */
export function assertBookable(amountCents: number) {
  if (amountCents > 0 && !paymentsEnabled()) {
    throw new HttpError(402, "Paid sessions aren't available yet. Mentio is free during the beta.");
  }
}
