import { describe, expect, it } from "vitest";
import {
  canTransition,
  generateSlots,
  isOfferedStart,
  statusMatchesPayment,
  validateAvailability,
  type AvailabilityWindow,
} from "@/lib/booking-rules";

// 2026-10-05 is a Monday.
const NOW = new Date("2026-10-05T06:00:00Z");
const weekdays9to5 = (["MON", "TUE", "WED", "THU", "FRI"] as const).map((weekday) => ({ weekday, startMinutes: 540, endMinutes: 1020 }));

describe("generateSlots", () => {
  it("builds slots in the mentor's timezone, not the server's", () => {
    // Sunday evening UTC; Monday 09:00 in Kolkata (UTC+5:30) is 03:30Z.
    const sunday = new Date("2026-10-04T12:00:00Z");
    const slots = generateSlots({ windows: weekdays9to5, timezone: "Asia/Kolkata", sessionLength: 30, busy: [], now: sunday, days: 3 });
    expect(slots[0].startsAt).toBe("2026-10-05T03:30:00.000Z");
    // 09:00-17:00 in 30-minute steps = 16 slots a day
    expect(slots.filter((s) => s.startsAt.startsWith("2026-10-05T0") || s.startsAt.startsWith("2026-10-05T1")).length).toBe(16);
  });

  it("never offers slots inside the minimum-notice window", () => {
    // 'now' is 09:20 in Kolkata; with 60 min notice the first slot is 10:30.
    const now = new Date("2026-10-05T03:50:00Z");
    const slots = generateSlots({ windows: weekdays9to5, timezone: "Asia/Kolkata", sessionLength: 30, busy: [], now, days: 1 });
    expect(slots[0].startsAt).toBe("2026-10-05T05:00:00.000Z"); // 10:30 IST
  });

  it("removes slots that overlap an existing booking, but not adjacent ones", () => {
    const busy = [{ startsAt: new Date("2026-10-05T10:00:00Z"), endsAt: new Date("2026-10-05T10:30:00Z") }];
    const slots = generateSlots({ windows: weekdays9to5, timezone: "UTC", sessionLength: 30, busy, now: NOW, days: 1 });
    const starts = slots.map((s) => s.startsAt);
    expect(starts).not.toContain("2026-10-05T10:00:00.000Z");
    expect(starts).toContain("2026-10-05T09:30:00.000Z");
    expect(starts).toContain("2026-10-05T10:30:00.000Z");
  });

  it("does not duplicate slots when windows overlap", () => {
    const windows: AvailabilityWindow[] = [
      { weekday: "MON", startMinutes: 540, endMinutes: 660 },
      { weekday: "MON", startMinutes: 600, endMinutes: 720 },
    ];
    const slots = generateSlots({ windows, timezone: "UTC", sessionLength: 30, busy: [], now: NOW, days: 1 });
    const starts = slots.map((s) => s.startsAt);
    expect(new Set(starts).size).toBe(starts.length);
  });

  it("stays correct across a DST change (US spring forward, Mar 8 2026)", () => {
    const now = new Date("2026-03-06T00:00:00Z");
    const windows: AvailabilityWindow[] = [{ weekday: "SUN", startMinutes: 540, endMinutes: 600 }];
    const slots = generateSlots({ windows, timezone: "America/New_York", sessionLength: 30, busy: [], now, days: 4 });
    // 09:00 EDT (UTC-4) after the switch = 13:00Z; before it would be 14:00Z.
    expect(slots[0].startsAt).toBe("2026-03-08T13:00:00.000Z");
  });

  it("falls back to UTC for an invalid timezone instead of throwing", () => {
    const slots = generateSlots({ windows: weekdays9to5, timezone: "Not/AZone", sessionLength: 30, busy: [], now: NOW, days: 1 });
    expect(slots[0].startsAt).toBe("2026-10-05T09:00:00.000Z");
  });

  it("respects the session length", () => {
    const slots = generateSlots({ windows: [{ weekday: "MON", startMinutes: 540, endMinutes: 660 }], timezone: "UTC", sessionLength: 60, busy: [], now: NOW, days: 1 });
    expect(slots.map((s) => s.startsAt)).toEqual(["2026-10-05T09:00:00.000Z", "2026-10-05T10:00:00.000Z"]);
    expect(slots[0].endsAt).toBe("2026-10-05T10:00:00.000Z");
  });
});

describe("isOfferedStart", () => {
  const base = { windows: weekdays9to5, timezone: "Asia/Kolkata", sessionLength: 30 };
  it("accepts a real slot", () => {
    expect(isOfferedStart({ ...base, startsAt: new Date("2026-10-05T03:30:00Z") })).toBe(true); // Mon 09:00 IST
  });
  it("rejects off-grid, out-of-window, wrong-day and sub-minute times", () => {
    expect(isOfferedStart({ ...base, startsAt: new Date("2026-10-05T03:45:00Z") })).toBe(false); // 09:15 not on 30-min grid
    expect(isOfferedStart({ ...base, startsAt: new Date("2026-10-05T01:00:00Z") })).toBe(false); // 06:30 IST, before window
    expect(isOfferedStart({ ...base, startsAt: new Date("2026-10-10T03:30:00Z") })).toBe(false); // Saturday
    expect(isOfferedStart({ ...base, startsAt: new Date("2026-10-05T03:30:20Z") })).toBe(false); // has seconds
  });
  it("rejects a slot that would run past the end of the window", () => {
    expect(isOfferedStart({ ...base, startsAt: new Date("2026-10-05T11:30:00Z") })).toBe(false); // 17:00 IST start
  });
});

describe("validateAvailability", () => {
  it("accepts a normal week", () => expect(validateAvailability(weekdays9to5)).toBeNull());
  it("rejects inverted, off-grid and overlapping windows", () => {
    expect(validateAvailability([{ weekday: "MON", startMinutes: 600, endMinutes: 540 }])).toMatch(/after/);
    expect(validateAvailability([{ weekday: "MON", startMinutes: 541, endMinutes: 600 }])).toMatch(/15-minute/);
    expect(
      validateAvailability([
        { weekday: "MON", startMinutes: 540, endMinutes: 660 },
        { weekday: "MON", startMinutes: 600, endMinutes: 720 },
      ]),
    ).toMatch(/overlap/);
  });
});

describe("status rules", () => {
  it("only allows sensible transitions", () => {
    expect(canTransition("CONFIRMED", "COMPLETED")).toBe(true);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
  });
  it("a priced booking cannot be confirmed without payment", () => {
    expect(statusMatchesPayment({ status: "CONFIRMED", amountCents: 5000, paymentStatus: "PENDING" })).toBe(false);
    expect(statusMatchesPayment({ status: "CONFIRMED", amountCents: 5000, paymentStatus: null })).toBe(false);
    expect(statusMatchesPayment({ status: "CONFIRMED", amountCents: 5000, paymentStatus: "PAID" })).toBe(true);
    expect(statusMatchesPayment({ status: "CONFIRMED", amountCents: 0, paymentStatus: "NOT_REQUIRED" })).toBe(true);
    expect(statusMatchesPayment({ status: "PENDING", amountCents: 5000, paymentStatus: "PENDING" })).toBe(true);
  });
});

import { isValidTimezone, listTimezones } from "@/lib/time";

describe("timezone list", () => {
  it("offers modern names that the runtime accepts", () => {
    const zones = listTimezones();
    expect(zones[0]).toBe("UTC");
    expect(zones).toContain("Asia/Kolkata");
    expect(zones).not.toContain("Asia/Calcutta");
    expect(zones.every(isValidTimezone)).toBe(true);
  });
});
