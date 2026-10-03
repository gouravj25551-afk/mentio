import { auth } from "@/lib/auth";
import { apiCatch, apiError, apiOk } from "@/lib/api";
import { leaveReview } from "@/features/bookings/actions";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHENTICATED", 401);
    const review = await leaveReview(await req.json());
    return apiOk(review, 201);
  } catch (err) {
    return apiCatch(err);
  }
}
