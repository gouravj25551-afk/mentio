import crypto from "node:crypto";

import { env } from "@/lib/env";

/** A keyed digest is essential here: six-digit codes cannot resist offline hashing. */
export function hashSignupCode(email: string, code: string) {
  return crypto.createHmac("sha256", env.AUTH_SECRET).update(`mentio-signup-code:${email}:${code}`).digest("hex");
}

export function generateSignupCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}
