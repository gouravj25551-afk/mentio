// Payments abstraction. Current implementation is a stub: free bookings
// skip the provider entirely, paid bookings go through this interface.
// Add a Stripe/Razorpay adapter without changing booking code.

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
  createIntent(input: PaymentIntentInput): Promise<PaymentIntent>;
  cancelIntent(id: string): Promise<void>;
  captureIntent(id: string): Promise<PaymentIntent>;
}

class NoopPayments implements PaymentsAdapter {
  async createIntent(input: PaymentIntentInput) {
    return { id: `noop_${input.bookingId}`, status: "succeeded" as const };
  }
  async cancelIntent() {}
  async captureIntent(id: string) {
    return { id, status: "succeeded" as const };
  }
}

export const payments: PaymentsAdapter = new NoopPayments();
