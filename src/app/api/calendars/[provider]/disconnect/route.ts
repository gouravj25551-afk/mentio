import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { CalendarProvider } from "@prisma/client";

export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/sign-in", req.url));
  const mentor = await db.mentorProfile.findUnique({ where: { userId: session.user.id } });
  if (!mentor) return NextResponse.redirect(new URL("/dashboard/mentor", req.url));
  const { provider } = await ctx.params;
  const normalized = provider.toUpperCase().replace("-", "_") as CalendarProvider;
  await db.calendarConnection.deleteMany({ where: { mentorProfileId: mentor.id, provider: normalized } });
  return NextResponse.redirect(new URL("/dashboard/mentor/calendars", req.url));
}
