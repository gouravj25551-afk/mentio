// Thin Razorpay REST client. No SDK: three small calls and two HMAC checks are
// easier to audit and test than a dependency. All money is in paise.
import "server-only";
import crypto from "node:crypto";

import { env } from "@/lib/env";
import { HttpError } from "@/lib/errors";
import { logError } from "@/lib/log";

const API = "https://api.razorpay.com/v1";

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string; receipt: string | null };

function credentials() {
  const id = env.RAZORPAY_KEY_ID;
  const secret = env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new HttpError(503, "Payments aren't configured yet. Please try again later.");
  return { id, secret };
}

/** Public key id the browser needs to open checkout. */
export const razorpayKeyId = () => credentials().id;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const { id, secret } = credentials();
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "content-type": "application/json",
        ...init?.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logError("razorpay.network", err);
    throw new HttpError(502, "Couldn't reach the payment provider. Please try again.");
  }
  if (!res.ok) {
    // Razorpay's own error text can mention account details: log it, show something generic.
    logError("razorpay.api_error", new Error(`${res.status} ${await res.text().catch(() => "")}`.slice(0, 500)));
    throw new HttpError(502, "The payment provider rejected the request. Please try again.");
  }
  return (await res.json()) as T;
}

/** Creates an order. `receipt` (≤40 chars) and `notes` come back on the dashboard and in webhooks. */
export function createOrder(input: { amount: number; currency: string; receipt: string; notes: Record<string, string> }) {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({ amount: input.amount, currency: input.currency, receipt: input.receipt.slice(0, 40), notes: input.notes }),
  });
}

const hmac = (secret: string, data: string) => crypto.createHmac("sha256", secret).update(data).digest("hex");

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Checks the signature Razorpay Checkout hands the browser: HMAC(order_id|payment_id) with the key secret. */
export function verifyCheckoutSignature(input: { orderId: string; paymentId: string; signature: string }) {
  const { secret } = credentials();
  return safeEqualHex(hmac(secret, `${input.orderId}|${input.paymentId}`), input.signature);
}

/** Checks a webhook: HMAC of the raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqualHex(hmac(secret, rawBody), signature);
}
