import { db } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api";
import { getAvailableSlots } from "@/features/bookings/slots";

export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const mentor = await db.mentorProfile.findFirst({ where: { slug, status: "APPROVED", acceptingBookings: true } });
  if (!mentor) return apiError("Mentor not found", 404);
  const slots = await getAvailableSlots({ mentorProfileId: mentor.id, days: 21, sessionLength: mentor.sessionLength });
  return apiOk(slots);
}
