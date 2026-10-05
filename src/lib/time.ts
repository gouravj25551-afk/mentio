import { TZDate } from "@date-fns/tz";

/** True if `tz` is an IANA zone this runtime knows (e.g. "Asia/Kolkata"). */
export function isValidTimezone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Falls back to UTC for a missing or invalid zone so one bad value can't break scheduling. */
export const safeTimezone = (tz: string | null | undefined) => (isValidTimezone(tz) ? tz : "UTC");

// ICU reports some zones under their pre-rename names (Asia/Calcutta), which people
// can't find in a picker. Show the current names; both resolve identically.
const MODERN_NAMES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
};

/** All IANA zones the runtime supports (current names), for timezone pickers. */
export function listTimezones(): string[] {
  const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  const zones = (fn ? fn("timeZone") : []).map((z) => MODERN_NAMES[z] ?? z).filter(isValidTimezone);
  return [...new Set(["UTC", ...zones])].sort((x, y) => (x === "UTC" ? -1 : y === "UTC" ? 1 : x.localeCompare(y)));
}

/** The wall-clock reading of an instant in a zone. */
export function wallClock(instant: Date, tz: string) {
  const d = new TZDate(instant, safeTimezone(tz));
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    weekday: d.getDay(), // 0 = Sunday
    minutes: d.getHours() * 60 + d.getMinutes(),
    seconds: d.getSeconds(),
    ms: d.getMilliseconds(),
  };
}

/** The instant at which a zone's wall clock reads y-m-d plus `minutes` after midnight. */
export function instantAt(year: number, month: number, day: number, minutes: number, tz: string): Date {
  // Constructing from wall-clock parts keeps DST transitions correct; minutes may exceed 1440.
  const d = new TZDate(year, month, day, 0, minutes, 0, 0, safeTimezone(tz));
  return new Date(d.getTime());
}

/** "Mon, Oct 6, 3:30 PM IST" — always in the given zone, so server and client agree. */
export function formatInZone(instant: Date | string, tz: string, opts: Intl.DateTimeFormatOptions = {}) {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone(tz),
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    ...opts,
  }).format(date);
}

/** "Mon, Oct 6, 2026" in the given zone. */
export function formatDayInZone(instant: Date | string, tz: string) {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone(tz),
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** "3:30 PM", or "3:30 PM IST" when `withZone` is set. */
export function formatTimeInZone(instant: Date | string, tz: string, withZone = false) {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone(tz),
    hour: "numeric",
    minute: "2-digit",
    ...(withZone ? { timeZoneName: "short" as const } : {}),
  }).format(date);
}
