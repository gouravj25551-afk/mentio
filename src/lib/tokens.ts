import crypto from "node:crypto";

/**
 * One-time tokens (password reset, email verification) are emailed in the
 * clear but stored only as a SHA-256 hash, so a database leak or read-only
 * access cannot be used to take over accounts.
 */
export function generateToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
