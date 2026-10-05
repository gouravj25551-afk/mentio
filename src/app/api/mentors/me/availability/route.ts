import { auth } from "@/lib/auth";
import { apiCatch, apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";
import { availabilitySchema } from "@/lib/validators";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHENTICATED", 401);
    const mentor = await db.mentorProfile.findUnique({ where: { userId: session.user.id } });
    if (!mentor) return apiError("Not a mentor", 403);
    if (mentor.status !== "APPROVED") return apiError("Availability opens once your application is approved.", 403);
    const body = availabilitySchema.parse(await req.json());
    await db.$transaction([
      db.availability.deleteMany({ where: { mentorProfileId: mentor.id } }),
      db.availability.createMany({
        data: body.slots.map((s) => ({ ...s, mentorProfileId: mentor.id })),
      }),
    ]);
    return apiOk({ ok: true });
  } catch (err) {
    return apiCatch(err);
  }
}
