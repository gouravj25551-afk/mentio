import { auth } from "@/lib/auth";
import { apiCatch, apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";
import { profileSchema } from "@/lib/validators";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHENTICATED", 401);
    const data = profileSchema.parse(await req.json());
    const [user] = await db.$transaction([
      db.user.update({ where: { id: session.user.id }, data: { name: data.name } }),
      db.profile.upsert({
        where: { userId: session.user.id },
        update: {
          headline: data.headline,
          bio: data.bio,
          location: data.location,
          timezone: data.timezone,
          languages: data.languages ?? [],
          website: data.website || null,
          twitter: data.twitter,
          linkedin: data.linkedin,
          github: data.github,
        },
        create: {
          userId: session.user.id,
          headline: data.headline,
          bio: data.bio,
          location: data.location,
          timezone: data.timezone ?? "UTC",
          languages: data.languages ?? [],
          website: data.website || null,
          twitter: data.twitter,
          linkedin: data.linkedin,
          github: data.github,
        },
      }),
    ]);
    return apiOk(user);
  } catch (err) {
    return apiCatch(err);
  }
}
