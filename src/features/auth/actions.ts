"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import crypto from "node:crypto";

import { signIn, signOut, auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { authLimiter } from "@/lib/rate-limit";
import { forgotSchema, resetSchema, signInSchema, signUpSchema } from "@/lib/validators";
import { Role } from "@prisma/client";

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
  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role as Role,
      passwordHash,
      profile: { create: {} },
    },
  });

  if (user.role === Role.MENTOR) {
    const base = user.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ?? `mentor-${user.id.slice(0, 6)}`;
    const slug = `${base}-${user.id.slice(0, 6)}`;
    await db.mentorProfile.create({
      data: {
        userId: user.id,
        slug,
        headline: `${user.name ?? "Mentor"} on Mentio`,
        bio: "Tell students about your journey.",
        experience: "",
      },
    });
  }

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

export async function forgotPasswordAction(_prev: unknown, formData: FormData): Promise<ActionResult & { devToken?: string }> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, error: "Enter a valid email." };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Always return ok to avoid user enumeration
  if (!user) return { ok: true };
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60_000);
  await db.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] password reset link: /reset-password?token=${token}`);
    return { ok: true, devToken: token };
  }
  // In production, email the link via the mailer service.
  return { ok: true };
}

export async function resetPasswordAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const record = await db.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
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
