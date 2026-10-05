import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { MentorProfileForm } from "@/components/dashboard/mentor-profile-form";

export default async function MentorProfilePage() {
  const user = await requireRole(["MENTOR", "ADMIN"]);
  const [mentor, categories, skills] = await Promise.all([
    db.mentorProfile.findUnique({
      where: { userId: user.id },
      include: { categories: true, skills: true },
    }),
    db.category.findMany({ orderBy: { order: "asc" } }),
    db.skill.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!mentor) return <p className="text-sm text-muted-foreground">Finish onboarding first.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Mentor profile</h1>
        <p className="text-sm text-muted-foreground">This is what students see on your public profile.</p>
      </div>
      <MentorProfileForm
        categories={categories}
        skills={skills}
        approved={mentor.status === "APPROVED"}
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
    </div>
  );
}
