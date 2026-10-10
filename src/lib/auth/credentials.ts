import bcrypt from "bcryptjs";
import { CredentialsSignin } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { checkLimits, clientIp, limiters } from "@/lib/rate-limit";

/** Thrown only after the password was verified, so it reveals nothing to a guesser. */
export class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified";
}
export class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

export class RateLimiterUnavailable extends CredentialsSignin {
  code = "rate_limiter_unavailable";
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

// Compared against when the email is unknown so response time doesn't reveal
// whether an account exists.
let dummyHash: string | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("not-a-real-password", 12));

/**
 * Validates an email/password login. Runs for every credential login, including
 * direct POSTs to /api/auth/callback/credentials, so the rate limit lives here
 * and cannot be bypassed by skipping the sign-in form's server action.
 */
export async function authorizeCredentials(credentials: unknown, headers: Headers) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;
  const email = parsed.data.email.trim().toLowerCase();

  const status = await checkLimits([limiters.signIn.check(email), limiters.signInIp.check(clientIp(headers))]);
  if (status === "limited") throw new RateLimited();
  if (status === "unavailable") throw new RateLimiterUnavailable();

  const user = await db.user.findUnique({ where: { email }, omit: { passwordHash: false } });
  const matches = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? getDummyHash());
  if (!user?.passwordHash || !matches) return null;
  if (!user.emailVerified) throw new EmailNotVerified();

  return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
}
