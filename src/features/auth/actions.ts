"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import crypto from "node:crypto";

import { signIn, signOut, auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { authLimiter } from "@/lib/rate-limit";
import { forgotSchema, resetSchema, signInSchema, signUpSchema } from "@/lib/validators";
import { MentorStatus, Role } from "@prisma/client";
import { env } from "@/lib/env";
import { slugify } from "@/lib/utils";
import { sendEmailSafely } from "@/services/email/send";
import { absoluteUrl, passwordResetEmail } from "@/services/email/templates";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function signInWithPassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: "Enter a valid email and password." };

  const limit = await authLimiter.check(`signin:${parsed.data.email}`);
  if (!limit.ok) return { ok: false, error: "Too many attempts. Try again shortly." };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Invalid email or password." };
    }
    throw err;
  }
  return { ok: true };
}

export async function signUpAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") ?? "STUDENT",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { ok: false, error: "An account with this email already exists." };

  const passwordHash = await hashPassword(parsed.data.password);
  const isMentor = parsed.data.role === "MENTOR";
  // A mentor sign-up is an application: the profile starts as PENDING (the schema default)
  // and stays hidden from discovery and bookings until an admin approves it.
  await db.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: isMentor ? Role.MENTOR : Role.STUDENT,
      passwordHash,
      profile: { create: {} },
      ...(isMentor
        ? {
            mentorProfile: {
              create: {
                slug: `${slugify(parsed.data.name) || "mentor"}-${crypto.randomBytes(3).toString("hex")}`,
                headline: `${parsed.data.name} on Mentio`,
                bio: "",
                experience: "",
                status: MentorStatus.PENDING,
                currency: "INR",
              },
            },
          }
        : {}),
    },
  });

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
  });
  return { ok: true };
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function forgotPasswordAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, error: "Enter a valid email." };

  const limit = await authLimiter.check(`forgot:${parsed.data.email}`);
  if (!limit.ok) return { ok: false, error: "Too many attempts. Try again shortly." };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Always return ok to avoid user enumeration
  if (!user) return { ok: true };

  // Only a hash is stored, so a database leak can't be turned into working reset links.
  const token = crypto.randomBytes(32).toString("hex");
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    db.passwordResetToken.create({
      data: { token: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 60 * 60_000) },
    }),
  ]);

  // The token only ever travels by email. It is never returned to the browser or logged.
  await sendEmailSafely("password reset", {
    to: user.email,
    ...passwordResetEmail({
      name: user.name,
      resetUrl: absoluteUrl(env.NEXT_PUBLIC_APP_URL, `/reset-password?token=${token}`),
    }),
  });
  return { ok: true };
}

export async function resetPasswordAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const record = await db.passwordResetToken.findUnique({ where: { token: hashToken(parsed.data.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "This reset link has expired. Request a new one." };
  }
  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return { ok: true };
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  return session.user;
}
