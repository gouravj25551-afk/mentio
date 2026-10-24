import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export default async function DashboardIndex() {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/dashboard/admin");
  if (user.role === "MENTOR") {
    const mentor = await db.mentorProfile.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });
    // Mentors must complete their application and be approved before they can
    // use the live mentor workspace.
    if (!mentor || mentor.status !== "APPROVED") redirect("/onboarding/mentor");
    redirect("/dashboard/mentor");
  }
  redirect("/dashboard/student");
}
