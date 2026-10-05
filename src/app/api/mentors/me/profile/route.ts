import { auth } from "@/lib/auth";
import { apiCatch, apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";
import { mentorProfileSchema } from "@/lib/validators";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHENTICATED", 401);
    const data = mentorProfileSchema.parse(await req.json());
    const mentor = await db.mentorProfile.findUnique({ where: { userId: session.user.id } });
    if (!mentor) return apiError("Not a mentor", 403);
    if (mentor.status === "SUSPENDED") return apiError("Your mentor account is suspended.", 403);
    // Pending and rejected mentors can only edit their application. Pricing, session length
    // and booking availability are unlocked by admin approval and enforced here, not just in the UI.
    const approved = mentor.status === "APPROVED";
    const updated = await db.$transaction(async (tx) => {
      await tx.mentorCategory.deleteMany({ where: { mentorProfileId: mentor.id } });
      await tx.mentorSkill.deleteMany({ where: { mentorProfileId: mentor.id } });
      return tx.mentorProfile.update({
        where: { id: mentor.id },
        data: {
          headline: data.headline,
          bio: data.bio,
          experience: data.experience,
          achievements: data.achievements,
          portfolio: data.portfolio,
          categories: { create: data.categoryIds.map((id) => ({ categoryId: id })) },
          skills: { create: data.skillIds.map((id) => ({ skillId: id })) },
          ...(approved
            ? {
                rateCents: data.rateCents,
                currency: "INR",
                sessionLength: data.sessionLength,
                responseTimeHrs: data.responseTimeHrs,
                acceptingBookings: data.acceptingBookings,
              }
            : {}),
        },
      });
    });
    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}
