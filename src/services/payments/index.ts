// Payments.
//
// No payment provider is integrated. Until one is, Mentio runs in FREE BETA:
// every session is free, mentors cannot set a price, and a priced booking is
// refused outright rather than created in a state that looks paid.
//
// To add a provider (Stripe, Razorpay, ...), implement PaymentsAdapter, then:
//  1. create bookings as PENDING with paymentStatus PENDING and amountCents > 0,
//  2. confirm (status CONFIRMED + paymentStatus PAID) only from the provider's
//     verified webhook, and
//  3. extend PAYMENTS_MODE in src/lib/env.ts.
// The Booking_paid_before_confirmed_check constraint rejects a priced booking
// that is CONFIRMED without being PAID, so a bug here cannot slip through.
import { HttpError } from "@/lib/errors";

export interface PaymentIntentInput {
  amountCents: number;
  currency: string;
  bookingId: string;
  studentId: string;
}

export interface PaymentIntent {
  id: string;
  clientSecret?: string;
  status: "requires_payment_method" | "requires_confirmation" | "succeeded" | "canceled";
}

export interface PaymentsAdapter {
  readonly enabled: boolean;
  createIntent(input: PaymentIntentInput): Promise<PaymentIntent>;
  cancelIntent(id: string): Promise<void>;
  captureIntent(id: string): Promise<PaymentIntent>;
}

const unavailable = () => new HttpError(402, "Paid sessions aren't available yet. Mentio is free during the beta.");

class NoPayments implements PaymentsAdapter {
  readonly enabled = false;
  async createIntent(): Promise<PaymentIntent> {
    throw unavailable();
  }
  async cancelIntent(): Promise<void> {
    throw unavailable();
  }
  async captureIntent(): Promise<PaymentIntent> {
    throw unavailable();
  }
}

export const payments: PaymentsAdapter = new NoPayments();

/** Throws unless the session is free or a real payment provider is enabled. */
export function assertBookable(amountCents: number) {
  if (amountCents > 0 && !payments.enabled) throw unavailable();
}
