import "server-only";
import { addMinutes, startOfDay, addDays } from "date-fns";
import { db } from "@/lib/db";
import type { Availability, Weekday } from "@prisma/client";

const WEEKDAY_INDEX: Record<Weekday, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

export type Slot = { startsAt: string; endsAt: string };

export async function getAvailableSlots(opts: {
  mentorProfileId: string;
  from?: Date;
  days?: number;
  sessionLength?: number;
}): Promise<Slot[]> {
  const from = opts.from ?? new Date();
  const days = opts.days ?? 14;
  const sessionLength = opts.sessionLength ?? 30;

  const [availability, bookings] = await Promise.all([
    db.availability.findMany({ where: { mentorProfileId: opts.mentorProfileId } }),
    db.booking.findMany({
      where: {
        mentorProfileId: opts.mentorProfileId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { gte: from, lte: addDays(from, days + 1) },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const byWeekday = new Map<number, Availability[]>();
  for (const a of availability) {
    const key = WEEKDAY_INDEX[a.weekday];
    const arr = byWeekday.get(key) ?? [];
    arr.push(a);
    byWeekday.set(key, arr);
  }

  const slots: Slot[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const date = addDays(startOfDay(from), i);
    const dow = date.getDay();
    const windows = byWeekday.get(dow) ?? [];
    for (const w of windows) {
      let cursor = addMinutes(date, w.startMinutes);
      const end = addMinutes(date, w.endMinutes);
      while (addMinutes(cursor, sessionLength) <= end) {
        const slotEnd = addMinutes(cursor, sessionLength);
        if (cursor > now) {
          const overlap = bookings.some(
            (b) => !(slotEnd <= b.startsAt || cursor >= b.endsAt)
          );
          if (!overlap) slots.push({ startsAt: cursor.toISOString(), endsAt: slotEnd.toISOString() });
        }
        cursor = slotEnd;
      }
    }
  }
  return slots;
}
