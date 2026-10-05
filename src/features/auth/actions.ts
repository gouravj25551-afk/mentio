"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { Prisma, Role } from "@prisma/client";

import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { allowed, clientIp, limiters } from "@/lib/rate-limit";
import { generateToken, hashToken } from "@/lib/tokens";
import { slugify } from "@/lib/utils";
import { forgotSchema, resetSchema, signInSchema, signUpSchema } from "@/lib/validators";
import { appUrl, sendEmailSafely } from "@/services/email";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string; code?: "email_not_verified" };

const VERIFY_TTL_MS = 24 * 60 * 60_000;
const RESET_TTL_MS = 60 * 60_000;
const TOO_MANY: ActionResult = { ok: false, error: "Too many attempts. Please try again later." };

async function ip() {
  return clientIp(await headers());
}

export async function signInWithPassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: "Enter a valid email and password." };

  try {
    // Rate limiting happens inside the credentials provider so it also covers
    // direct calls to /api/auth/callback/credentials.
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      const code = (err as { code?: string }).code;
      if (code === "rate_limited") return TOO_MANY;
      if (code === "email_not_verified") {
        return { ok: false, error: "Please verify your email first. Check your inbox for the link.", code: "email_not_verified" };
      }
      return { ok: false, error: "Invalid email or password." };
    }
    throw err;
  }
  return { ok: true };
}

/**
 * Creates an account and emails a verification link.
 *
 * The response is identical whether or not the email is already registered, so
 * this form cannot be used to discover who has an account. (A duplicate gets a
 * "you already have an account" email instead.)
 */
export async function signUpAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") ?? "STUDENT",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  if (!(await allowed([limiters.signUp.check(await ip())]))) return TOO_MANY;

  const { email, name, role } = parsed.data;
  const generic: ActionResult = { ok: true, message: "Check your email for a link to verify your account." };

  // Hash before branching so existing and new addresses take the same time.
  const passwordHash = await hashPassword(parsed.data.password);

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    await sendEmailSafely({
      to: email,
      subject: "You already have a Mentio account",
      text: `Someone tried to sign up to Mentio with this email address.\n\nIf it was you, sign in or reset your password:\n${appUrl("/sign-in")}\n${appUrl("/forgot-password")}\n\nIf it wasn't you, you can ignore this email.`,
    });
    return generic;
  }

  const { token, hash } = generateToken();
  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, role: role as Role, passwordHash, profile: { create: {} } },
        select: { id: true, name: true },
      });
      if (role === "MENTOR") {
        const base = slugify(name) || "mentor";
        await tx.mentorProfile.create({
          data: {
            userId: user.id,
            slug: `${base}-${user.id.slice(-6)}`,
            headline: `${name} on Mentio`,
            bio: "",
            experience: "",
          },
        });
      }
      await tx.verificationToken.create({
        data: { identifier: email, token: hash, expires: new Date(Date.now() + VERIFY_TTL_MS), userId: user.id },
      });
    });
  } catch (err) {
    // Lost a race with a concurrent sign-up for the same email: behave as the duplicate case.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return generic;
    throw err;
  }

  await sendEmailSafely({
    to: email,
    subject: "Verify your Mentio email",
    text: `Welcome to Mentio, ${name}.\n\nConfirm your email to finish creating your account:\n${appUrl(`/verify-email?token=${token}`)}\n\nThis link expires in 24 hours. If you didn't sign up, ignore this email.`,
  });
  return generic;
}

export async function resendVerificationAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  const generic: ActionResult = { ok: true, message: "If that account needs verifying, we've sent a new link." };
  if (!parsed.success) return generic;
  if (!(await allowed([limiters.forgot.check(parsed.data.email), limiters.forgotIp.check(await ip())]))) return TOO_MANY;

  const user = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, emailVerified: true } });
  if (!user || user.emailVerified) return generic;

  const { token, hash } = generateToken();
  await db.$transaction([
    db.verificationToken.deleteMany({ where: { userId: user.id } }),
    db.verificationToken.create({
      data: { identifier: parsed.data.email, token: hash, expires: new Date(Date.now() + VERIFY_TTL_MS), userId: user.id },
    }),
  ]);
  await sendEmailSafely({
    to: parsed.data.email,
    subject: "Verify your Mentio email",
    text: `Confirm your email:\n${appUrl(`/verify-email?token=${token}`)}\n\nThis link expires in 24 hours.`,
  });
  return generic;
}

export async function verifyEmailAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "");
  if (token.length < 20) return { ok: false, error: "This verification link is invalid." };
  if (!(await allowed([limiters.verify.check(await ip())]))) return TOO_MANY;

  const record = await db.verificationToken.findUnique({ where: { token: hashToken(token) } });
  if (!record?.userId || record.expires < new Date()) {
    return { ok: false, error: "This verification link has expired. Request a new one from the sign-in page." };
  }
  // deleteMany + count makes consumption atomic: only one concurrent request wins.
  const consumed = await db.verificationToken.deleteMany({ where: { token: record.token } });
  if (consumed.count !== 1) return { ok: false, error: "This verification link has already been used." };

  await db.user.updateMany({ where: { id: record.userId, emailVerified: null }, data: { emailVerified: new Date() } });
  return { ok: true, message: "Email verified. You can sign in now." };
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/** Always answers the same way, so it can't be used to learn which emails are registered. */
export async function forgotPasswordAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, error: "Enter a valid email." };
  if (!(await allowed([limiters.forgot.check(parsed.data.email), limiters.forgotIp.check(await ip())]))) return TOO_MANY;

  const generic: ActionResult = { ok: true, message: "If that email has an account, we've sent a reset link." };
  const user = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (!user) return generic;

  const { token, hash } = generateToken();
  await db.$transaction([
    // Only the newest link works.
    db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    db.passwordResetToken.create({ data: { token: hash, userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) } }),
  ]);
  await sendEmailSafely({
    to: parsed.data.email,
    subject: "Reset your Mentio password",
    text: `Use this link to choose a new password:\n${appUrl(`/reset-password?token=${token}`)}\n\nIt expires in 1 hour and works once. If you didn't ask for this, you can ignore this email — your password hasn't changed.`,
  });
  return generic;
}

export async function resetPasswordAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({ token: formData.get("token"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  if (!(await allowed([limiters.reset.check(await ip())]))) return TOO_MANY;

  const invalid: ActionResult = { ok: false, error: "This reset link has expired. Request a new one." };
  const record = await db.passwordResetToken.findUnique({ where: { token: hashToken(parsed.data.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return invalid;

  const passwordHash = await hashPassword(parsed.data.password);
  const ok = await db.$transaction(async (tx) => {
    // Claim the token first; if a concurrent request already did, count is 0.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) return false;
    // Following a link sent to the inbox also proves the email is theirs.
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash, emailVerified: new Date() } });
    return true;
  });
  return ok ? { ok: true, message: "Password updated. Sign in to continue." } : invalid;
}
