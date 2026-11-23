import { apiCatch, apiOk } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { startCheckout } from "@/features/bookings/payments";

/** (Re)opens checkout for a held booking, e.g. after the student closed the payment window. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser("STUDENT");
    const { id } = await ctx.params;
    return apiOk(await startCheckout(user, id));
  } catch (err) {
    return apiCatch(err);
  }
}
