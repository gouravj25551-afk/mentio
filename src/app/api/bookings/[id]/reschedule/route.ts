import { apiCatch, apiOk, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { rescheduleBooking } from "@/features/bookings/service";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    // Ownership and role rules live in the service so every caller gets them.
    const booking = await rescheduleBooking(user, id, await readJson(req));
    return apiOk(booking);
  } catch (err) {
    return apiCatch(err);
  }
}
