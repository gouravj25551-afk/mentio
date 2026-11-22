// The three ways a mentor's free time reaches students:
//  1. Mentio availability (weekly hours in the mentor's timezone),
//  2. a connected Cal.com account, and
//  3. a connected Calendly account.
// Students always book on Mentio. Meetings booked in Cal.com / Calendly arrive
// through signed webhooks and must hide (and block) the same time on Mentio.
import crypto from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as webhook } from "@/app/api/webhooks/calendars/[provider]/route";
import { GET as slotsApi } from "@/app/api/mentors/[slug]/slots/route";
import { createBooking, rescheduleBooking } from "@/features/bookings/service";
import { getAvailableSlots } from "@/features/bookings/slots";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { actor, createMentor, createUser, resetDb } from "./helpers/factories";

const CAL_SECRET = "cal-webhook-secret";
const CALENDLY_KEY = "calendly-signing-key";

beforeEach(async () => {
  await resetDb();
  const { env } = await import("@/lib/env");
  (env as { CAL_COM_WEBHOOK_SECRET?: string }).CAL_COM_WEBHOOK_SECRET = CAL_SECRET;
  (env as { CALENDLY_WEBHOOK_SIGNING_KEY?: string }).CALENDLY_WEBHOOK_SIGNING_KEY = CALENDLY_KEY;
});

async function expectStatus(p: Promise<unknown>, status: number) {
  const err = await p.then(() => null, (e) => e);
  expect(err).toBeInstanceOf(HttpError);
  expect((err as HttpError).status).toBe(status);
}

function calComRequest(body: unknown, secret = CAL_SECRET) {
  const raw = JSON.stringify(body);
  const sig = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return webhook(
    new Request("http://x/api/webhooks/calendars/cal-com", { method: "POST", body: raw, headers: { "x-cal-signature-256": sig } }),
    { params: Promise.resolve({ provider: "cal-com" }) },
  );
}

function calendlyRequest(body: unknown, key = CALENDLY_KEY, t = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify(body);
  const v1 = crypto.createHmac("sha256", key).update(`${t}.${raw}`).digest("hex");
  return webhook(
    new Request("http://x/api/webhooks/calendars/calendly", { method: "POST", body: raw, headers: { "calendly-webhook-signature": `t=${t},v1=${v1}` } }),
    { params: Promise.resolve({ provider: "calendly" }) },
  );
}

const calComEvent = (trigger: string, uid: string, start: string, end: string, organizer = 42, rescheduleUid?: string) => ({
  triggerEvent: trigger,
  payload: { uid, startTime: start, endTime: end, organizer: { id: organizer }, ...(rescheduleUid ? { rescheduleUid } : {}) },
});

const calendlyEvent = (event: string, id: string, start: string, end: string, user = "USER123", from?: string) => ({
  event,
  payload: {
    scheduled_event: {
      uri: `https://api.calendly.com/scheduled_events/${id}`,
      start_time: start,
      end_time: end,
      status: event === "invitee.canceled" ? "canceled" : "active",
      event_memberships: [{ user: `https://api.calendly.com/users/${user}` }],
    },
    ...(from ? { rescheduled_from: `https://api.calendly.com/scheduled_events/${from}` } : {}),
  },
});

async function mentorWithConnection(provider: "CAL_COM" | "CALENDLY", externalId: string) {
  const { user, mentor } = await createMentor();
  await db.calendarConnection.create({ data: { mentorProfileId: mentor.id, provider, externalId, active: true } });
  return { user, mentor };
}

const has = (slots: { startsAt: string }[], iso: string) => slots.some((s) => s.startsAt === iso);

describe("1. Mentio availability", () => {
  it("turns weekly hours in the mentor's timezone into the right instants for everyone", async () => {
    // 10:00-11:00 India time every day = 04:30-05:30 UTC.
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
    const { mentor } = await createMentor({
      timezone: "Asia/Kolkata",
      sessionLength: 30,
      windows: days.map((weekday) => ({ weekday, startMinutes: 600, endMinutes: 660 })),
    });
    const slots = await getAvailableSlots({ ...mentor, days: 7 });
    expect(slots.length).toBeGreaterThanOrEqual(10);
    for (const s of slots) {
      const d = new Date(s.startsAt);
      expect([4 * 60 + 30, 5 * 60]).toContain(d.getUTCHours() * 60 + d.getUTCMinutes());
      expect(new Date(s.endsAt).getTime() - d.getTime()).toBe(30 * 60_000);
    }
  });

  it("serves the same slots through the public slots API", async () => {
    const { mentor } = await createMentor({ timezone: "America/New_York" });
    const res = await slotsApi(new Request(`http://x/api/mentors/${mentor.slug}/slots`), { params: Promise.resolve({ slug: mentor.slug }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    const direct = await getAvailableSlots({ ...mentor, days: 14 });
    expect(body.slots.slice(0, 5)).toEqual(direct.slice(0, 5));
  });

  it("a mentor with no free hours offers nothing and can't be booked", async () => {
    const { mentor } = await createMentor({ windows: [] });
    const student = await createUser();
    expect(await getAvailableSlots({ ...mentor, days: 14 })).toEqual([]);
    const start = new Date(Date.now() + 26 * 3_600_000);
    start.setUTCMinutes(0, 0, 0);
    await expectStatus(createBooking(actor(student), { mentorProfileId: mentor.id, startsAt: start.toISOString(), topic: "Hello" }), 409);
  });
});

describe.each([
  {
    name: "2. Cal.com",
    provider: "CAL_COM" as const,
    externalId: "42",
    created: (id: string, s: string, e: string) => calComRequest(calComEvent("BOOKING_CREATED", id, s, e)),
    cancelled: (id: string, s: string, e: string) => calComRequest(calComEvent("BOOKING_CANCELLED", id, s, e)),
    rescheduled: (id: string, s: string, e: string, from: string) => calComRequest(calComEvent("BOOKING_RESCHEDULED", id, s, e, 42, from)),
    forged: (id: string, s: string, e: string) => calComRequest(calComEvent("BOOKING_CREATED", id, s, e), "wrong-secret"),
    otherAccount: (id: string, s: string, e: string) => calComRequest(calComEvent("BOOKING_CREATED", id, s, e, 999)),
  },
  {
    name: "3. Calendly",
    provider: "CALENDLY" as const,
    externalId: "USER123",
    created: (id: string, s: string, e: string) => calendlyRequest(calendlyEvent("invitee.created", id, s, e)),
    cancelled: (id: string, s: string, e: string) => calendlyRequest(calendlyEvent("invitee.canceled", id, s, e)),
    rescheduled: (id: string, s: string, e: string, from: string) => calendlyRequest(calendlyEvent("invitee.created", id, s, e, "USER123", from)),
    forged: (id: string, s: string, e: string) => calendlyRequest(calendlyEvent("invitee.created", id, s, e), "wrong-key"),
    otherAccount: (id: string, s: string, e: string) => calendlyRequest(calendlyEvent("invitee.created", id, s, e, "SOMEONE_ELSE")),
  },
])("$name", (p) => {
  it("a meeting booked there hides the slot on Mentio, and cancelling it brings the slot back", async () => {
    const { mentor } = await mentorWithConnection(p.provider, p.externalId);
    const [slot] = await getAvailableSlots({ ...mentor, days: 14 });

    expect((await p.created("evt-1", slot.startsAt, slot.endsAt)).status).toBe(200);
    expect(has(await getAvailableSlots({ ...mentor, days: 14 }), slot.startsAt)).toBe(false);

    expect((await p.cancelled("evt-1", slot.startsAt, slot.endsAt)).status).toBe(200);
    expect(has(await getAvailableSlots({ ...mentor, days: 14 }), slot.startsAt)).toBe(true);
  });

  it("a student can't book over it, even from a stale page that still shows the slot", async () => {
    const { mentor } = await mentorWithConnection(p.provider, p.externalId);
    const student = await createUser();
    const [slot] = await getAvailableSlots({ ...mentor, days: 14 });
    await p.created("evt-2", slot.startsAt, slot.endsAt);

    await expectStatus(createBooking(actor(student), { mentorProfileId: mentor.id, startsAt: slot.startsAt, topic: "Career chat" }), 409);
    expect(await db.booking.count()).toBe(0);
  });

  it("a student can't reschedule onto it either", async () => {
    const { mentor } = await mentorWithConnection(p.provider, p.externalId);
    const student = await createUser();
    const [first, second] = await getAvailableSlots({ ...mentor, days: 14 });
    const booking = await createBooking(actor(student), { mentorProfileId: mentor.id, startsAt: first.startsAt, topic: "Career chat" });
    await p.created("evt-3", second.startsAt, second.endsAt);

    await expectStatus(rescheduleBooking(actor(student), booking.id, { startsAt: second.startsAt }), 409);
  });

  it("a rescheduled meeting frees the old time and blocks the new one", async () => {
    const { mentor } = await mentorWithConnection(p.provider, p.externalId);
    const [a, b] = await getAvailableSlots({ ...mentor, days: 14 });
    await p.created("evt-old", a.startsAt, a.endsAt);
    await p.rescheduled("evt-new", b.startsAt, b.endsAt, "evt-old");

    const slots = await getAvailableSlots({ ...mentor, days: 14 });
    expect(has(slots, a.startsAt)).toBe(true);
    expect(has(slots, b.startsAt)).toBe(false);
  });

  it("forged deliveries are refused and change nothing", async () => {
    const { mentor } = await mentorWithConnection(p.provider, p.externalId);
    const [slot] = await getAvailableSlots({ ...mentor, days: 14 });
    expect((await p.forged("evt-x", slot.startsAt, slot.endsAt)).status).toBe(401);
    expect(await db.calendarBlock.count()).toBe(0);
    expect(has(await getAvailableSlots({ ...mentor, days: 14 }), slot.startsAt)).toBe(true);
  });

  it("another account's meetings don't affect this mentor", async () => {
    const { mentor } = await mentorWithConnection(p.provider, p.externalId);
    const [slot] = await getAvailableSlots({ ...mentor, days: 14 });
    expect((await p.otherAccount("evt-y", slot.startsAt, slot.endsAt)).status).toBe(200);
    expect(await db.calendarBlock.count()).toBe(0);
    expect(has(await getAvailableSlots({ ...mentor, days: 14 }), slot.startsAt)).toBe(true);
  });

  it("after disconnecting, old meetings no longer hide slots", async () => {
    const { mentor } = await mentorWithConnection(p.provider, p.externalId);
    const [slot] = await getAvailableSlots({ ...mentor, days: 14 });
    await p.created("evt-z", slot.startsAt, slot.endsAt);
    await db.calendarConnection.updateMany({ where: { mentorProfileId: mentor.id }, data: { active: false } });
    expect(has(await getAvailableSlots({ ...mentor, days: 14 }), slot.startsAt)).toBe(true);
  });
});
