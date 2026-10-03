import { auth } from "@/lib/auth";
import { apiCatch, apiError, apiOk } from "@/lib/api";
import { rescheduleBooking } from "@/features/bookings/actions";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHENTICATED", 401);
    const { id } = await ctx.params;
    const body = await req.json();
    const booking = await rescheduleBooking(id, body);
    return apiOk(booking);
  } catch (err) {
    return apiCatch(err);
  }
}
