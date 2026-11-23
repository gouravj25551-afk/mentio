// Razorpay -> Mentio. Configure at https://dashboard.razorpay.com/app/website-app-settings/webhooks
// with events payment.captured and order.paid, and the same secret as RAZORPAY_WEBHOOK_SECRET.
// This is the safety net for a student who paid but closed the tab before the browser could report it.
import { apiError, apiOk } from "@/lib/api";
import { confirmPayment } from "@/features/bookings/payments";
import { logError } from "@/lib/log";
import { verifyWebhookSignature } from "@/services/payments/razorpay";

type PaymentEntity = { id?: string; order_id?: string; amount?: number; currency?: string; status?: string };
type Event = { event?: string; payload?: { payment?: { entity?: PaymentEntity }; order?: { entity?: { id?: string; amount_paid?: number; currency?: string } } } };

export async function POST(req: Request) {
  // The signature covers the exact bytes sent, so read the raw body before parsing.
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) return apiError("Invalid signature.", 401);

  let evt: Event;
  try {
    evt = JSON.parse(raw) as Event;
  } catch {
    return apiError("Invalid body.", 400);
  }

  if (evt.event !== "payment.captured" && evt.event !== "order.paid") return apiOk({ ignored: evt.event ?? "unknown" });

  const payment = evt.payload?.payment?.entity;
  const orderId = payment?.order_id ?? evt.payload?.order?.entity?.id;
  const paymentId = payment?.id;
  const amount = payment?.amount ?? evt.payload?.order?.entity?.amount_paid;
  const currency = payment?.currency ?? evt.payload?.order?.entity?.currency;
  if (!orderId || !paymentId || typeof amount !== "number" || !currency) return apiOk({ ignored: "incomplete" });

  try {
    const { outcome } = await confirmPayment({ orderId, paymentId, paid: { amount, currency } });
    return apiOk({ outcome });
  } catch (err) {
    // 500 makes Razorpay retry later, which is what we want for a transient failure.
    logError("razorpay.webhook_failed", err);
    return apiError("Could not process the event.", 500);
  }
}
