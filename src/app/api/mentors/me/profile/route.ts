import { apiCatch, apiOk, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { HttpError, notFound } from "@/lib/errors";
import { mentorProfileSchema } from "@/lib/validators";

export async function PUT(req: Request) {
  try {
    const user = await requireApiUser("MENTOR");
    const data = mentorProfileSchema.parse(await readJson(req));
    const mentor = await db.mentorProfile.findUnique({ where: { userId: user.id }, select: { id: true, status: true } });
    if (!mentor) throw notFound("Mentor profile not found.");

    // Unknown ids would otherwise surface as a foreign-key 500.
    const [categories, skills] = await Promise.all([
      db.category.count({ where: { id: { in: data.categoryIds } } }),
      db.skill.count({ where: { id: { in: data.skillIds } } }),
    ]);
    if (categories !== new Set(data.categoryIds).size || skills !== new Set(data.skillIds).size) {
      throw new HttpError(422, "One of the selected categories or skills no longer exists.");
    }

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
          timezone: data.timezone,
          achievements: data.achievements,
          portfolio: data.portfolio,
          acceptingBookings: data.acceptingBookings,
          // A rejected mentor who edits their profile is resubmitting it for review.
          // (A suspended mentor stays suspended: only an admin lifts that.)
          ...(mentor.status === "REJECTED" ? { status: "PENDING" as const } : {}),
          categories: { create: [...new Set(data.categoryIds)].map((categoryId) => ({ categoryId })) },
          skills: { create: [...new Set(data.skillIds)].map((skillId) => ({ skillId })) },
        },
        select: { id: true, slug: true, status: true },
      });
    });
    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}
