import { apiCatch, apiOk, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { availabilitySchema } from "@/lib/validators";

export async function PUT(req: Request) {
  try {
    const user = await requireApiUser("MENTOR");
    const mentor = await db.mentorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!mentor) throw notFound("Mentor profile not found.");
    const body = availabilitySchema.parse(await readJson(req));
    await db.$transaction([
      db.availability.deleteMany({ where: { mentorProfileId: mentor.id } }),
      db.availability.createMany({ data: body.slots.map((s) => ({ ...s, mentorProfileId: mentor.id })) }),
    ]);
    return apiOk({ ok: true });
  } catch (err) {
    return apiCatch(err);
  }
}
