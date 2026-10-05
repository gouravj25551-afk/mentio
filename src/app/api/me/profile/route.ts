import { apiCatch, apiOk, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { profileSchema } from "@/lib/validators";

export async function PUT(req: Request) {
  try {
    const user = await requireApiUser();
    const data = profileSchema.parse(await readJson(req));
    const profile = {
      headline: data.headline,
      bio: data.bio,
      location: data.location,
      timezone: data.timezone,
      languages: data.languages ?? [],
      website: data.website || null,
      twitter: data.twitter || null,
      linkedin: data.linkedin || null,
      github: data.github || null,
    };
    const [updated] = await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { name: data.name }, select: { id: true, name: true } }),
      db.profile.upsert({
        where: { userId: user.id },
        update: profile,
        create: { userId: user.id, ...profile, timezone: data.timezone ?? "UTC" },
      }),
    ]);
    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}
