import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(cents: number, currency = "INR") {
  if (!cents) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDate(d: Date | string, opts?: Intl.DateTimeFormatOptions) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function formatTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

export function formatRelative(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const minute = 60_000, hour = 60 * minute, day = 24 * hour, week = 7 * day;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  if (abs < week) return rtf.format(Math.round(diff / day), "day");
  return formatDate(date);
}

export function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function toMinutes(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Only same-site relative paths are allowed as post-login redirects. Anything
 * else (absolute URLs, `//host`, `/\host`) falls back, which closes the open
 * redirect that a user-controlled `?next=` would otherwise create.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
