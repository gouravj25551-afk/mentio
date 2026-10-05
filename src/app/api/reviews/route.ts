import { apiCatch, apiOk, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { leaveReview } from "@/features/bookings/service";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser("STUDENT");
    return apiOk(await leaveReview(user, await readJson(req)), 201);
  } catch (err) {
    return apiCatch(err);
  }
}
