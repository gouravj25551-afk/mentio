import { auth } from "@/lib/auth";
import { apiCatch, apiError, apiOk } from "@/lib/api";
import { toggleSave } from "@/features/bookings/actions";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHENTICATED", 401);
  const items = await db.savedMentor.findMany({
    where: { userId: session.user.id },
    include: { mentorProfile: { include: { user: true, categories: { include: { category: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return apiOk(items);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHENTICATED", 401);
    const { mentorProfileId } = (await req.json()) as { mentorProfileId: string };
    const result = await toggleSave(mentorProfileId);
    return apiOk(result);
  } catch (err) {
    return apiCatch(err);
  }
}
