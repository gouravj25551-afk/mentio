import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  return session.user;
}

export async function requireRole(role: Role | Role[]) {
  const user = await requireUser();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) redirect("/");
  return user;
}

export async function optionalUser() {
  const session = await auth();
  return session?.user ?? null;
}
