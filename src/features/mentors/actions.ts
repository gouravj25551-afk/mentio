"use server";

import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

/**
 * A student applying to become a mentor. It is a POST (server action) on purpose:
 * the old onboarding page created the profile and changed the user's role on a
 * plain GET, so merely visiting a link could do it. Admins can't use this, so an
 * admin can never be downgraded by it.
 */
export async function becomeMentorAction() {
  const user = await requireRole(["STUDENT", "MENTOR"]);
  const existing = await db.mentorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!existing) {
    await db.$transaction([
      db.mentorProfile.create({
        data: {
          userId: user.id,
          slug: `${slugify(user.name ?? "") || "mentor"}-${user.id.slice(-6)}`,
          headline: `${user.name ?? "Mentor"} on Mentio`,
          bio: "",
          experience: "",
        },
      }),
      ...(user.role === "STUDENT" ? [db.user.update({ where: { id: user.id }, data: { role: "MENTOR" } })] : []),
    ]);
  }
  redirect("/onboarding/mentor");
}
