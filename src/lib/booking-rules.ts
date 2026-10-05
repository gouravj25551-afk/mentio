// Pure scheduling and booking rules. No database access, so every rule here is
// unit-tested directly and shared by the booking service, the slots API and the UI.
import type { BookingStatus, Weekday } from "@prisma/client";

import { instantAt, safeTimezone, wallClock } from "@/lib/time";

export const MIN_NOTICE_MINUTES = 60;
export const MAX_ADVANCE_DAYS = 60;

export const WEEKDAY_INDEX: Record<Weekday, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

/** Statuses that occupy a mentor's calendar. */
export const ACTIVE_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED"];

// ---- Status transitions ------------------------------------------------------

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export const canTransition = (from: BookingStatus, to: BookingStatus) => TRANSITIONS[from].includes(to);

// ---- Payment status ----------------------------------------------------------

export const PAYMENT = { NOT_REQUIRED: "NOT_REQUIRED", PENDING: "PENDING", PAID: "PAID", FAILED: "FAILED", REFUNDED: "REFUNDED" } as const;

/**
 * A booking may only be CONFIRMED or COMPLETED if it is free or PAID. Mirrors the
 * Booking_paid_before_confirmed_check constraint so the app fails with a clear
 * message before the database has to.
 */
export function statusMatchesPayment(b: { status: BookingStatus; amountCents: number; paymentStatus: string | null }) {
  if (b.status !== "CONFIRMED" && b.status !== "COMPLETED") return true;
  return b.amountCents === 0 || b.paymentStatus === PAYMENT.PAID;
}

// ---- Slots -------------------------------------------------------------------

export type AvailabilityWindow = { weekday: Weekday; startMinutes: number; endMinutes: number };
export type Slot = { startsAt: string; endsAt: string };
export type Busy = { startsAt: Date; endsAt: Date };

/** Earliest instant a booking may start. */
export const earliestStart = (now: Date) => new Date(now.getTime() + MIN_NOTICE_MINUTES * 60_000);
/** Latest instant a booking may start. */
export const latestStart = (now: Date) => new Date(now.getTime() + MAX_ADVANCE_DAYS * 86_400_000);

/**
 * Generates the bookable slots a mentor offers.
 *
 * Availability windows are wall-clock times in the MENTOR's timezone (a 09:00
 * window means 09:00 where the mentor lives), so slots are built in that zone and
 * returned as absolute instants. Slots are laid out from each window's start in
 * steps of `sessionLength`, minus anything inside the notice period or already booked.
 */
export function generateSlots(opts: {
  windows: AvailabilityWindow[];
  timezone: string;
  sessionLength: number;
  busy: Busy[];
  now?: Date;
  days?: number;
}): Slot[] {
  const now = opts.now ?? new Date();
  const days = Math.min(opts.days ?? 14, MAX_ADVANCE_DAYS);
  const tz = safeTimezone(opts.timezone);
  const earliest = earliestStart(now).getTime();
  const latest = latestStart(now).getTime();
  const len = opts.sessionLength * 60_000;

  const byWeekday = new Map<number, AvailabilityWindow[]>();
  for (const w of opts.windows) {
    const key = WEEKDAY_INDEX[w.weekday];
    byWeekday.set(key, [...(byWeekday.get(key) ?? []), w]);
  }

  const today = wallClock(now, tz);
  const slots = new Map<number, Slot>(); // keyed by start so overlapping windows don't duplicate

  // +1 day on each side covers the offset between the mentor's date and UTC.
  for (let i = 0; i <= days + 1; i++) {
    const midnight = instantAt(today.year, today.month, today.day + i, 0, tz);
    const { year, month, day, weekday } = wallClock(midnight, tz);
    for (const w of byWeekday.get(weekday) ?? []) {
      for (let m = w.startMinutes; m + opts.sessionLength <= w.endMinutes; m += opts.sessionLength) {
        const start = instantAt(year, month, day, m, tz);
        const t = start.getTime();
        if (t < earliest || t > latest) continue;
        const end = t + len;
        if (opts.busy.some((b) => t < b.endsAt.getTime() && end > b.startsAt.getTime())) continue;
        slots.set(t, { startsAt: start.toISOString(), endsAt: new Date(end).toISOString() });
      }
    }
  }
  return [...slots.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s);
}

/**
 * True if `startsAt` is exactly one of the slots this mentor offers: on the
 * session-length grid of some availability window, entirely inside it, in the
 * mentor's timezone. The server uses this so a client can't book 03:17 on a
 * Sunday just by crafting a request.
 */
export function isOfferedStart(opts: {
  startsAt: Date;
  windows: AvailabilityWindow[];
  timezone: string;
  sessionLength: number;
}): boolean {
  const { minutes, weekday, seconds, ms } = wallClock(opts.startsAt, opts.timezone);
  if (seconds !== 0 || ms !== 0) return false;
  return opts.windows.some(
    (w) =>
      WEEKDAY_INDEX[w.weekday] === weekday &&
      minutes >= w.startMinutes &&
      minutes + opts.sessionLength <= w.endMinutes &&
      (minutes - w.startMinutes) % opts.sessionLength === 0,
  );
}

/** Validates a weekly availability set: sane windows on a 15-minute grid, none overlapping. */
export function validateAvailability(windows: AvailabilityWindow[]): string | null {
  for (const w of windows) {
    if (w.startMinutes % 15 !== 0 || w.endMinutes % 15 !== 0) return "Times must be on a 15-minute boundary.";
    if (w.endMinutes <= w.startMinutes) return "Each window must end after it starts.";
    if (w.startMinutes < 0 || w.endMinutes > 1440) return "Times must be within a single day.";
  }
  const byDay = new Map<Weekday, AvailabilityWindow[]>();
  for (const w of windows) byDay.set(w.weekday, [...(byDay.get(w.weekday) ?? []), w]);
  for (const [day, list] of byDay) {
    const sorted = [...list].sort((a, b) => a.startMinutes - b.startMinutes);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startMinutes < sorted[i - 1].endMinutes) return `Windows on ${day} overlap.`;
    }
  }
  return null;
}
