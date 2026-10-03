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
    const updated = await db.$transaction(async (tx) => {
      await tx.mentorCategory.deleteMany({ where: { mentorProfileId: mentor.id } });
      await tx.mentorSkill.deleteMany({ where: { mentorProfileId: mentor.id } });
      return tx.mentorProfile.update({
        where: { id: mentor.id },
        data: {
          headline: data.headline,
          bio: data.bio,
          experience: data.experience,
          rateCents: data.rateCents,
          currency: data.currency,
          sessionLength: data.sessionLength,
          responseTimeHrs: data.responseTimeHrs,
          achievements: data.achievements,
          portfolio: data.portfolio,
          acceptingBookings: data.acceptingBookings,
          categories: { create: data.categoryIds.map((id) => ({ categoryId: id })) },
          skills: { create: data.skillIds.map((id) => ({ skillId: id })) },
        },
      });
    });
    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}
