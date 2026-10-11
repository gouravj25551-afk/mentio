"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { Prisma, Role } from "@prisma/client";

import { signIn } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { checkLimits, clientIp, limiters, type LimitResult } from "@/lib/rate-limit";
import { generateSignupCode, hashSignupCode } from "@/lib/signup-code";
import { generateToken, hashToken } from "@/lib/tokens";
import { emailSchema, signUpSchema } from "@/lib/validators";
import { waitlistMode } from "@/lib/waitlist";
import { sendEmailSafely } from "@/services/email";

type Result = { ok: true; grant?: string; signedIn?: boolean } | { ok: false; error: string };
const invalid = "That code is incorrect or expired. Request a new code and try again.";

async function gate(checks: Promise<LimitResult>[]): Promise<Result | null> {
  const status = await checkLimits(checks);
  return status === "ok" ? null : { ok: false, error: status === "limited" ? "Too many attempts. Try again later." : "Verification is temporarily unavailable. Try again shortly." };
}

async function requestIp() { return clientIp(await headers()); }

export async function requestWaitlistCode(emailInput: string): Promise<Result> {
  if (!waitlistMode) return { ok: false, error: "Waitlist signup is closed." };
  const parsed = emailSchema.safeParse(emailInput);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const email = parsed.data;
  const blocked = await gate([limiters.signupCodeSend.check(email), limiters.signUp.check(await requestIp())]);
  if (blocked) return blocked;

  const code = generateSignupCode();
  const token = hashSignupCode(email, code);
  const identifier = `signup-code:${email}`;
  await db.$transaction([
    db.verificationToken.deleteMany({ where: { identifier } }),
    db.verificationToken.create({ data: { identifier, token, expires: new Date(Date.now() + 10 * 60_000) } }),
  ]);
  const sent = await sendEmailSafely({
    to: email,
    subject: "Your Mentio verification code",
    text: `Your Mentio verification code is ${code}.\n\nEnter it on the signup page. It expires in 10 minutes. If you didn't request this, ignore this email.`,
  });
  if (!sent) {
    await db.verificationToken.deleteMany({ where: { token } });
    return { ok: false, error: "We couldn't send the code. Please try again." };
  }
  return { ok: true };
}

export async function verifyWaitlistCode(emailInput: string, codeInput: string): Promise<Result> {
  if (!waitlistMode) return { ok: false, error: "Waitlist signup is closed." };
  const parsed = emailSchema.safeParse(emailInput);
  if (!parsed.success || !/^\d{6}$/.test(codeInput)) return { ok: false, error: invalid };
  const email = parsed.data;
  const blocked = await gate([limiters.signupCodeVerify.check(email), limiters.signupCodeVerifyIp.check(await requestIp())]);
  if (blocked) return blocked;
  const token = hashSignupCode(email, codeInput);
  const grant = generateToken();
  const claimed = await db.$transaction(async (tx) => {
    const consumed = await tx.verificationToken.deleteMany({ where: { identifier: `signup-code:${email}`, token, userId: null, expires: { gt: new Date() } } });
    if (consumed.count !== 1) return false;
    await tx.verificationToken.deleteMany({ where: { identifier: `signup-grant:${email}` } });
    await tx.verificationToken.create({ data: { identifier: `signup-grant:${email}`, token: grant.hash, expires: new Date(Date.now() + 15 * 60_000) } });
    return true;
  });
  if (!claimed) return { ok: false, error: invalid };
  return { ok: true, grant: grant.token };
}

export async function completeWaitlistSignup(input: { email: string; name: string; role: string; password: string; grant: string }): Promise<Result> {
  if (!waitlistMode) return { ok: false, error: "Waitlist signup is closed." };
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(input.grant)) return { ok: false, error: "Verification expired. Request a new code." };
  const { email, name, role, password } = parsed.data;
  const blocked = await gate([limiters.signUp.check(await requestIp())]);
  if (blocked) return blocked;
  const passwordHash = await hashPassword(password);
  const done = await db.$transaction(async (tx) => {
    const claimed = await tx.verificationToken.deleteMany({ where: { identifier: `signup-grant:${email}`, token: hashToken(input.grant), userId: null, expires: { gt: new Date() } } });
    if (claimed.count !== 1) return "expired";
    const existing = await tx.user.findUnique({ where: { email }, select: { id: true, emailVerified: true, role: true } });
    if (existing?.emailVerified || existing?.role === "ADMIN") return "existing";
    if (existing) {
      await tx.user.update({ where: { id: existing.id }, data: { name, role: role as Role, passwordHash, emailVerified: new Date() } });
      await tx.verificationToken.deleteMany({ where: { identifier: email, userId: existing.id } });
    } else {
      await tx.user.create({ data: { email, name, role: role as Role, passwordHash, emailVerified: new Date() } });
    }
    return "created";
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "existing" as const;
    throw error;
  });
  if (done === "expired") return { ok: false, error: "Verification expired. Request a new code." };
  if (done === "existing") return { ok: false, error: "This email already has an account. Please sign in instead." };
  try {
    await signIn("credentials", { email, password, redirect: false });
    return { ok: true, signedIn: true };
  } catch (error) {
    if (error instanceof AuthError) return { ok: true, signedIn: false };
    throw error;
  }
}
