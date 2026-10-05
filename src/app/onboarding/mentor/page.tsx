import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { MentorProfileForm } from "@/components/dashboard/mentor-profile-form";
import { Card } from "@/components/ui/card";

export default async function MentorOnboarding() {
  const user = await requireUser();
  let mentor = await db.mentorProfile.findUnique({
    where: { userId: user.id },
    include: { categories: true, skills: true },
  });
  if (!mentor) {
    const base = user.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ?? `mentor-${user.id.slice(0, 6)}`;
    mentor = await db.mentorProfile.create({
      data: {
        userId: user.id,
        slug: `${base}-${user.id.slice(0, 6)}`,
        headline: user.name ?? "New mentor on Mentio",
        bio: "Tell students about your journey.",
        experience: "",
      },
      include: { categories: true, skills: true },
    });
    await db.user.update({ where: { id: user.id }, data: { role: "MENTOR" } });
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
        <p className="mt-1 text-sm text-muted-foreground">
          Approval typically takes 48 hours. In the meantime, your profile won&apos;t be publicly discoverable.
        </p>
      </div>
      <Card className="p-6">
        <MentorProfileForm
          categories={categories}
          skills={skills}
          initial={{
            headline: mentor.headline,
            bio: mentor.bio,
            experience: mentor.experience,
            rateCents: mentor.rateCents,
            currency: mentor.currency,
            sessionLength: mentor.sessionLength,
            responseTimeHrs: mentor.responseTimeHrs,
            acceptingBookings: mentor.acceptingBookings,
            achievements: mentor.achievements,
            portfolio: mentor.portfolio,
            categoryIds: mentor.categories.map((c) => c.categoryId),
            skillIds: mentor.skills.map((s) => s.skillId),
          }}
        />
      </Card>
    </div>
  );
}
