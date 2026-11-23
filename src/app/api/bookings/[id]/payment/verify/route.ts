import { apiCatch, apiOk, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { verifyBookingPayment } from "@/features/bookings/payments";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser("STUDENT");
    const { id } = await ctx.params;
    const booking = await verifyBookingPayment(user, id, await readJson(req));
    return apiOk({ id: booking.id, status: booking.status, paymentStatus: booking.paymentStatus });
  } catch (err) {
    return apiCatch(err);
  }
}
