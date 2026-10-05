import { apiCatch, apiOk } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { cancelBooking } from "@/features/bookings/service";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    // Ownership and role rules live in the service so every caller gets them.
    const booking = await cancelBooking(user, id, await req.json().catch(() => ({})));
    return apiOk(booking);
  } catch (err) {
    return apiCatch(err);
  }
}
