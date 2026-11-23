"use client";
// Opens Razorpay Standard Checkout (cards, UPI incl. QR, netbanking, wallets).
// The browser only ever receives a signature to hand back to our server; whether the
// booking is paid is decided there, never here.

export type CheckoutParams = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  prefill: { name: string; email: string };
  timeoutSeconds: number;
};

export type CheckoutResult =
  | { status: "paid"; orderId: string; paymentId: string; signature: string }
  | { status: "dismissed" }
  | { status: "failed"; message: string };

type RazorpayCtor = new (opts: Record<string, unknown>) => { open(): void; on(evt: string, cb: (r: { error?: { description?: string } }) => void): void };

const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<RazorpayCtor> | null = null;

function loadScript(): Promise<RazorpayCtor> {
  const existing = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  loading ??= new Promise<RazorpayCtor>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SRC;
    el.async = true;
    el.onload = () => {
      const ctor = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
      if (ctor) resolve(ctor);
      else reject(new Error("Razorpay failed to load"));
    };
    el.onerror = () => {
      loading = null; // allow a retry after a network blip
      reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    };
    document.head.appendChild(el);
  });
  return loading;
}

export async function openCheckout(p: CheckoutParams): Promise<CheckoutResult> {
  let Razorpay: RazorpayCtor;
  try {
    Razorpay = await loadScript();
  } catch (e) {
    return { status: "failed", message: (e as Error).message };
  }
  return new Promise<CheckoutResult>((resolve) => {
    const rz = new Razorpay({
      key: p.keyId,
      order_id: p.orderId,
      amount: p.amount,
      currency: p.currency,
      name: "Mentio",
      description: p.description,
      prefill: p.prefill,
      timeout: p.timeoutSeconds,
      theme: { color: "#ffffff", backdrop_color: "#000000" },
      handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
        resolve({ status: "paid", orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
      modal: { ondismiss: () => resolve({ status: "dismissed" }), confirm_close: true },
    });
    // A failed attempt keeps the modal open so the student can try another method; surface it as a message only if they leave.
    rz.on("payment.failed", () => undefined);
    rz.open();
  });
}

/** Sends the signed result to our server, which decides whether the booking is now paid. */
export async function verifyPayment(bookingId: string, r: Extract<CheckoutResult, { status: "paid" }>) {
  const res = await fetch(`/api/bookings/${bookingId}/payment/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ razorpay_order_id: r.orderId, razorpay_payment_id: r.paymentId, razorpay_signature: r.signature }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? "We couldn't confirm your payment. If you were charged it will be refunded.");
  return body as { id: string; status: string; paymentStatus: string };
}
