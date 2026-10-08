import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { becomeMentorAction } from "@/features/mentors/actions";
import { MentorProfileForm } from "@/components/dashboard/mentor-profile-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Mentor onboarding", robots: { index: false } };

export default async function MentorOnboarding() {
  const user = await requireRole(["STUDENT", "MENTOR"]);
  const [mentor, profile] = await Promise.all([
    db.mentorProfile.findUnique({
    where: { userId: user.id },
    include: { categories: true, skills: true },
    }),
    db.profile.findUnique({ where: { userId: user.id }, select: { twitter: true, instagram: true, linkedin: true, github: true } }),
  ]);

  if (!mentor) {
    return (
      <div className="container mx-auto max-w-xl space-y-4 py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Become a mentor</h1>
        <p className="text-sm text-muted-foreground">Create a mentor profile. It becomes public after an admin approves it.</p>
        <form action={becomeMentorAction}>
          <Button type="submit" variant="brand">Start onboarding</Button>
        </form>
      </div>
    );
  }
  if (mentor.status === "APPROVED") redirect("/dashboard/mentor");

  const [categories, skills] = await Promise.all([
    db.category.findMany({ orderBy: { order: "asc" } }),
    db.skill.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="container mx-auto max-w-3xl space-y-6 py-16">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Mentor onboarding</div>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Set up your mentor profile</h1>
      </div>
      <Card className="p-6">
        <MentorProfileForm
          categories={categories}
          skills={skills}
          status={mentor.status}
          initial={{
            headline: mentor.headline,
            bio: mentor.bio,
            experience: mentor.experience,
            sessionLength: mentor.sessionLength,
            responseTimeHrs: mentor.responseTimeHrs,
            timezone: mentor.timezone,
            acceptingBookings: mentor.acceptingBookings,
            achievements: mentor.achievements,
            portfolio: mentor.portfolio,
            categoryIds: mentor.categories.map((c) => c.categoryId),
            skillIds: mentor.skills.map((s) => s.skillId),
            twitter: profile?.twitter ?? "",
            instagram: profile?.instagram ?? "",
            linkedin: profile?.linkedin ?? "",
            github: profile?.github ?? "",
          }}
        />
      </Card>
    </div>
  );
}
