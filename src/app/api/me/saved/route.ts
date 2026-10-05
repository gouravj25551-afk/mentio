import { apiCatch, apiOk, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { publicUser } from "@/lib/public-select";
import { toggleSave } from "@/features/bookings/service";

export async function GET() {
  try {
    const user = await requireApiUser("STUDENT");
    const items = await db.savedMentor.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        createdAt: true,
        mentorProfile: {
          select: {
            id: true, slug: true, headline: true, averageRating: true, status: true,
            user: { select: publicUser },
            categories: { select: { category: { select: { id: true, slug: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return apiOk(items);
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireApiUser("STUDENT");
    return apiOk(await toggleSave(user, await readJson(req)));
  } catch (err) {
    return apiCatch(err);
  }
}
