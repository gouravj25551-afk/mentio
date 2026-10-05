import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { forbidden, unauthenticated } from "@/lib/errors";
import { safeTimezone } from "@/lib/time";
import type { Role } from "@prisma/client";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  /** IANA zone from the user's profile; times are shown in it. Always valid. */
  timezone: string;
};

/**
 * The signed-in user, read fresh from the database (once per request).
 *
 * The role inside the JWT can be up to a week stale, so it is never used to
 * authorize anything. A deleted user or a changed role takes effect immediately.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, role: true, profile: { select: { timezone: true } } },
  });
  if (!user) return null;
  const { profile, ...rest } = user;
  return { ...rest, timezone: safeTimezone(profile?.timezone) };
});

// ---- Pages / server components: redirect on failure ----

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireRole(role: Role | Role[]) {
  const user = await requireUser();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) redirect("/dashboard");
  return user;
}

export async function optionalUser() {
  return getCurrentUser();
}

// ---- Route handlers & server actions: throw HttpError (mapped by apiCatch) ----

export async function requireApiUser(role?: Role | Role[]) {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.role)) throw forbidden();
  }
  return user;
}
