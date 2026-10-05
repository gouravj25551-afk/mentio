import { NextResponse } from "next/server";

import { apiCatch } from "@/lib/api";
import { db } from "@/lib/db";
import { notFound, tooMany } from "@/lib/errors";
import { allowed, clientIp, limiters } from "@/lib/rate-limit";
import { getAvailableSlots } from "@/features/bookings/slots";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await allowed([limiters.api.check(`slots:${clientIp(req.headers)}`)]))) throw tooMany();
    const { slug } = await ctx.params;
    const mentor = await db.mentorProfile.findUnique({
      where: { slug },
      select: { id: true, status: true, acceptingBookings: true, sessionLength: true, timezone: true },
    });
    // Unapproved mentors are invisible, same as a missing one.
    if (!mentor || mentor.status !== "APPROVED") throw notFound("Mentor not found.");
    const slots = await getAvailableSlots({ ...mentor, days: 21 });
    // Availability changes minute to minute, so never serve it from a cache.
    return NextResponse.json({ slots, timezone: mentor.timezone, sessionLength: mentor.sessionLength }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return apiCatch(err);
  }
}
