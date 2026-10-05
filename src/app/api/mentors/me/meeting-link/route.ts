import { apiCatch, apiOk, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { meetingLinkSchema } from "@/lib/validators";

/** Sets (or, with an empty string, clears) the mentor's own meeting link. */
export async function PUT(req: Request) {
  try {
    const user = await requireApiUser("MENTOR");
    const { meetingLink } = meetingLinkSchema.parse(await readJson(req));
    const result = await db.mentorProfile.updateMany({ where: { userId: user.id }, data: { meetingLink } });
    if (result.count !== 1) throw notFound("Mentor profile not found.");
    return apiOk({ meetingLink });
  } catch (err) {
    return apiCatch(err);
  }
}
