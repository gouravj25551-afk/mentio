import crypto from "node:crypto";

import { env } from "@/lib/env";

export const WAITLIST_CONFIRMATION_COOKIE = "mentio_waitlist_confirmed";
const TTL_SECONDS = 7 * 24 * 60 * 60;

/** Signed proof for the thank-you page, not an authentication session. */
export function createWaitlistConfirmation(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, expires: Date.now() + TTL_SECONDS * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", env.AUTH_SECRET).update(`waitlist:${payload}`).digest("base64url");
  return `${payload}.${signature}`;
}

export function readWaitlistConfirmation(value?: string) {
  if (!value) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;
  const expected = crypto.createHmac("sha256", env.AUTH_SECRET).update(`waitlist:${payload}`).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    const { email, expires } = parsed as { email?: unknown; expires?: unknown };
    return typeof email === "string" && typeof expires === "number" && expires > Date.now() ? email : null;
  } catch { return null; }
}
