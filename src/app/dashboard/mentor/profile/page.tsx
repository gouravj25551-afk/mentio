import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { MentorProfileForm } from "@/components/dashboard/mentor-profile-form";

export default async function MentorProfilePage() {
  const user = await requireRole("MENTOR");
  const [mentor, categories, skills, profile] = await Promise.all([
    db.mentorProfile.findUnique({
      where: { userId: user.id },
      include: { categories: true, skills: true },
    }),
    db.category.findMany({ orderBy: { order: "asc" } }),
    db.skill.findMany({ orderBy: { name: "asc" } }),
    db.profile.findUnique({ where: { userId: user.id }, select: { twitter: true, instagram: true, linkedin: true, github: true } }),
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
          verificationUrl: mentor.verificationUrl ?? "",
          categoryIds: mentor.categories.map((c) => c.categoryId),
          skillIds: mentor.skills.map((s) => s.skillId),
          twitter: profile?.twitter ?? "",
          instagram: profile?.instagram ?? "",
          linkedin: profile?.linkedin ?? "",
          github: profile?.github ?? "",
        }}
      />
    </div>
  );
}
