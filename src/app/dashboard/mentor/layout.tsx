import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";

/**
 * The mentor workspace is deliberately unavailable while an application is
 * being completed or reviewed. This prevents an unapproved profile from
 * looking live just because somebody knows a dashboard URL.
 */
export default async function MentorDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("MENTOR");
  const mentor = await db.mentorProfile.findUnique({
    where: { userId: user.id },
    select: { status: true },
  });

  if (!mentor || mentor.status !== "APPROVED") redirect("/onboarding/mentor");
  return children;
}
