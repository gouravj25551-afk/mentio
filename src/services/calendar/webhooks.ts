// Provider booking webhooks become private CalendarBlocks.  They never expose
// an external attendee as a Mentio user, but do remove the occupied time from
// the public Mentio slot picker.
import "server-only";
import crypto from "node:crypto";
import type { CalendarProvider } from "@prisma/client";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

type Block = { externalEventId: string; startsAt: Date; endsAt: Date; previousEventId?: string; cancelled: boolean };

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Cal.com signs the exact body with HMAC SHA-256 in x-cal-signature-256. */
export function verifyCalCom(raw: string, signature: string | null) {
  if (!env.CAL_COM_WEBHOOK_SECRET || !signature) return false;
  const expected = crypto.createHmac("sha256", env.CAL_COM_WEBHOOK_SECRET).update(raw).digest("hex");
  return safeEqual(expected, signature.replace(/^sha256=/i, ""));
}

/** Calendly's `t=...,v1=...` signature covers `${timestamp}.${rawBody}`. */
export function verifyCalendly(raw: string, header: string | null, now = Date.now()) {
  if (!env.CALENDLY_WEBHOOK_SIGNING_KEY || !header) return false;
  const parts = new Map(header.split(",").map((part) => part.trim().split("=", 2) as [string, string]));
  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature || !/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp) * 1000) > 180_000) return false;
  const expected = crypto.createHmac("sha256", env.CALENDLY_WEBHOOK_SIGNING_KEY).update(`${timestamp}.${raw}`).digest("hex");
  return safeEqual(expected, signature);
}

function validBlock(value: { externalEventId?: unknown; startsAt?: unknown; endsAt?: unknown; previousEventId?: unknown; cancelled?: boolean }): Block | null {
  if (typeof value.externalEventId !== "string" || typeof value.startsAt !== "string" || typeof value.endsAt !== "string") return null;
  const startsAt = new Date(value.startsAt);
  const endsAt = new Date(value.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) return null;
  return { externalEventId: value.externalEventId, startsAt, endsAt, previousEventId: typeof value.previousEventId === "string" ? value.previousEventId : undefined, cancelled: Boolean(value.cancelled) };
}

export function calComBlock(body: any): { organizerId?: string; block: Block | null } {
  const p = body?.payload;
  const cancelled = body?.triggerEvent === "BOOKING_CANCELLED" || body?.triggerEvent === "BOOKING_REJECTED";
  return {
    organizerId: p?.organizer?.id == null ? undefined : String(p.organizer.id),
    block: validBlock({ externalEventId: p?.uid, startsAt: p?.startTime, endsAt: p?.endTime, previousEventId: p?.rescheduleUid, cancelled }),
  };
}

export function calendlyBlock(body: any): { organizerId?: string; block: Block | null } {
  const p = body?.payload;
  const event = p?.scheduled_event;
  const organizer = Array.isArray(event?.event_memberships) ? event.event_memberships[0]?.user : body?.created_by;
  return {
    organizerId: typeof organizer === "string" ? organizer.split("/").pop() : undefined,
    block: validBlock({
      externalEventId: typeof event?.uri === "string" ? event.uri.split("/").pop() : undefined,
      startsAt: event?.start_time,
      endsAt: event?.end_time,
      previousEventId: p?.rescheduled_from?.split?.("/").pop?.(),
      cancelled: body?.event === "invitee.canceled" || event?.status === "canceled",
    }),
  };
}

export async function applyExternalBlock(provider: CalendarProvider, organizerId: string | undefined, block: Block | null) {
  if (!organizerId || !block) return false; // acknowledge unrelated/malformed deliveries without leaking connections
  const connection = await db.calendarConnection.findFirst({
    where: { provider, active: true, externalId: organizerId },
    select: { id: true },
  });
  if (!connection) return false;
  const now = new Date();
  if (block.previousEventId) {
    await db.calendarBlock.updateMany({ where: { calendarConnectionId: connection.id, externalEventId: block.previousEventId, cancelledAt: null }, data: { cancelledAt: now } });
  }
  await db.calendarBlock.upsert({
    where: { calendarConnectionId_externalEventId: { calendarConnectionId: connection.id, externalEventId: block.externalEventId } },
    update: { startsAt: block.startsAt, endsAt: block.endsAt, cancelledAt: block.cancelled ? now : null },
    create: { calendarConnectionId: connection.id, externalEventId: block.externalEventId, startsAt: block.startsAt, endsAt: block.endsAt, cancelledAt: block.cancelled ? now : null },
  });
  return true;
}
