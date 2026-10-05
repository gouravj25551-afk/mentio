import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { providerFromSlug } from "@/services/calendar/oauth";

export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: slug } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", req.url), 303);

  const provider = providerFromSlug(slug);
  const mentor = user.role === "MENTOR" ? await db.mentorProfile.findUnique({ where: { userId: user.id }, select: { id: true } }) : null;
  if (provider && mentor) {
    // Deleting the row removes the stored (encrypted) tokens entirely.
    await db.calendarConnection.deleteMany({ where: { mentorProfileId: mentor.id, provider: provider.provider } });
  }
  // 303 so the browser follows the POST with a GET.
  return NextResponse.redirect(new URL("/dashboard/mentor/calendars?disconnected=1", req.url), 303);
}
