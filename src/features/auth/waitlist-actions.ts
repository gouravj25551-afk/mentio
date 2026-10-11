"use server";

import { headers, cookies } from "next/headers";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { checkLimits, clientIp, limiters, type LimitResult } from "@/lib/rate-limit";
import { generateSignupCode, hashSignupCode } from "@/lib/signup-code";
import { emailSchema } from "@/lib/validators";
import { createWaitlistConfirmation, WAITLIST_CONFIRMATION_COOKIE } from "@/lib/waitlist-confirmation";
import { waitlistMode } from "@/lib/waitlist";
import { sendEmailSafely } from "@/services/email";

type Result = { ok: true } | { ok: false; error: string };
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
    text: `Your Mentio verification code is ${code}.\n\nEnter it on the waitlist page. It expires in 10 minutes. If you didn't request this, ignore this email.`,
  });
  if (!sent) {
    await db.verificationToken.deleteMany({ where: { token } });
    return { ok: false, error: "We couldn't send the code. Please try again." };
  }
  return { ok: true };
}

export async function verifyWaitlistCode(emailInput: string, codeInput: string, roleInput: string): Promise<Result> {
  if (!waitlistMode) return { ok: false, error: "Waitlist signup is closed." };
  const parsed = emailSchema.safeParse(emailInput);
  if (!parsed.success || !/^\d{6}$/.test(codeInput)) return { ok: false, error: invalid };
  if (roleInput !== "STUDENT" && roleInput !== "MENTOR") return { ok: false, error: "Choose how you want to join." };
  const email = parsed.data;
  const blocked = await gate([limiters.signupCodeVerify.check(email), limiters.signupCodeVerifyIp.check(await requestIp())]);
  if (blocked) return blocked;
  const token = hashSignupCode(email, codeInput);
  const claimed = await db.$transaction(async (tx) => {
    const consumed = await tx.verificationToken.deleteMany({ where: { identifier: `signup-code:${email}`, token, userId: null, expires: { gt: new Date() } } });
    if (consumed.count !== 1) return false;
    const existing = await tx.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
    if (existing) {
      if (!existing.emailVerified) await tx.user.update({ where: { id: existing.id }, data: { emailVerified: new Date() } });
    } else {
      await tx.user.create({ data: { email, role: roleInput, emailVerified: new Date() } });
    }
    return true;
  }).catch((error: unknown) => {
    // The transaction rolls back code consumption after a unique-email race.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  });
  if (!claimed) return { ok: false, error: invalid };
  (await cookies()).set(WAITLIST_CONFIRMATION_COOKIE, createWaitlistConfirmation(email), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/waitlist", maxAge: 7 * 24 * 60 * 60,
  });
  return { ok: true };
}
