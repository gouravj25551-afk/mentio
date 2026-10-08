import "server-only";
import { db } from "@/lib/db";
import { ACTIVE_STATUSES, generateSlots, type Slot } from "@/lib/booking-rules";
import { safeTimezone } from "@/lib/time";

export type { Slot };

/** Bookable slots for a mentor over the next `days` days (empty if the mentor can't take bookings). */
export async function getAvailableSlots(mentor: {
  id: string;
  status: string;
  acceptingBookings: boolean;
  sessionLength: number;
  timezone: string;
  days?: number;
}): Promise<Slot[]> {
  if (mentor.status !== "APPROVED" || !mentor.acceptingBookings) return [];
  const days = mentor.days ?? 14;
  const now = new Date();

  const [windows, bookings, calendarBlocks] = await Promise.all([
    db.availability.findMany({
      where: { mentorProfileId: mentor.id },
      select: { weekday: true, startMinutes: true, endMinutes: true },
    }),
    db.booking.findMany({
      where: {
        mentorProfileId: mentor.id,
        status: { in: ACTIVE_STATUSES },
        endsAt: { gt: now },
        startsAt: { lt: new Date(now.getTime() + (days + 2) * 86_400_000) },
      },
      select: { startsAt: true, endsAt: true },
    }),
    db.calendarBlock.findMany({
      where: {
        calendarConnection: { mentorProfileId: mentor.id, active: true },
        cancelledAt: null,
        endsAt: { gt: now },
        startsAt: { lt: new Date(now.getTime() + (days + 2) * 86_400_000) },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  return generateSlots({
    windows,
    timezone: safeTimezone(mentor.timezone),
    sessionLength: mentor.sessionLength,
    busy: [...bookings, ...calendarBlocks],
    now,
    days,
  });
}
