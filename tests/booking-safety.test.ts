import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as moderate } from "@/app/api/admin/mentors/[id]/moderate/route";
import { POST as postCancel } from "@/app/api/bookings/[id]/cancel/route";
import { GET as health } from "@/app/api/health/route";
import { GET as ready } from "@/app/api/ready/route";
import { countAffectedBookings, listAffectedBookings } from "@/features/bookings/attention";
import { cancelBooking, createBooking } from "@/features/bookings/service";
import { db } from "@/lib/db";
import { describeError, logError } from "@/lib/log";
import { actor, createMentor, createUser, inHours, insertBooking, offeredSlots, resetDb } from "./helpers/factories";
import { signInAs } from "./helpers/state";

const json = (body: unknown) =>
  new Request("http://localhost/api/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

beforeEach(async () => {
  await resetDb();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("future bookings when a mentor is rejected or suspended", () => {
  for (const action of ["REJECT", "SUSPEND"] as const) {
    it(`${action} keeps the booking, tells the admin how many are affected, and lists them`, async () => {
      const { mentor } = await createMentor();
      const student = await createUser();
      const upcoming = await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: inHours(48), status: "CONFIRMED" });
      await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: inHours(72), status: "CANCELLED" });
      await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: inHours(-48), status: "COMPLETED" });

      signInAs((await createUser({ role: "ADMIN" })).id);
      const res = await moderate(json({ action, reason: "Policy" }), params({ id: mentor.id }));
      expect(res.status).toBe(200);
      expect((await res.json()).affectedBookings).toBe(1);

      // Nothing was silently cancelled or notified on the student's behalf.
      expect((await db.booking.findUniqueOrThrow({ where: { id: upcoming.id } })).status).toBe("CONFIRMED");
      expect(await db.notification.count({ where: { userId: student.id } })).toBe(0);

      expect(await countAffectedBookings()).toBe(1);
      const listed = await listAffectedBookings();
      expect(listed.map((b) => b.id)).toEqual([upcoming.id]);
      expect(listed[0].mentorProfile.status).toBe(action === "REJECT" ? "REJECTED" : "SUSPENDED");
    });
  }

  it("approving or featuring reports zero affected bookings, and approved mentors are never flagged", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: inHours(48), status: "CONFIRMED" });
    signInAs((await createUser({ role: "ADMIN" })).id);
    const res = await moderate(json({ action: "FEATURE" }), params({ id: mentor.id }));
    expect((await res.json()).affectedBookings).toBe(0);
    expect(await countAffectedBookings()).toBe(0);
  });

  it("an admin can cancel an affected booking on purpose, and both people are told", async () => {
    const { mentor, user: mentorUser } = await createMentor({ status: "SUSPENDED" });
    const student = await createUser();
    const b = await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: inHours(48), status: "CONFIRMED" });
    signInAs((await createUser({ role: "ADMIN" })).id);
    const res = await postCancel(json({ reason: "Mentor unavailable" }), params({ id: b.id }));
    expect(res.status).toBe(200);
    expect(await countAffectedBookings()).toBe(0);
    const told = (await db.notification.findMany({ where: { type: "BOOKING_CANCELLED" } })).map((n) => n.userId).sort();
    expect(told).toEqual([student.id, mentorUser.id].sort());
  });
});

describe("notifications follow the committed state", () => {
  it("a notification failure after commit does not fail (or hide) a saved booking", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    const [slot] = await offeredSlots(mentor);
    // A real database failure: every notification insert raises.
    await db.$executeRawUnsafe(`CREATE FUNCTION fail_notif() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'notifications down'; END $$ LANGUAGE plpgsql`);
    await db.$executeRawUnsafe(`CREATE TRIGGER fail_notif BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION fail_notif()`);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const booking = await createBooking(actor(student), { mentorProfileId: mentor.id, startsAt: slot.startsAt, topic: "Resume review" });
      expect(booking.status).toBe("CONFIRMED");
      expect(await db.booking.count()).toBe(1);
      expect(spy.mock.calls.some((c) => String(c[0]).includes("notification.failed"))).toBe(true);
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER fail_notif ON "Notification"`);
      await db.$executeRawUnsafe(`DROP FUNCTION fail_notif()`);
    }
  });

  it("a failed booking (slot taken) sends no notification", async () => {
    const { mentor } = await createMentor();
    const [a, b] = [await createUser(), await createUser()];
    const [slot] = await offeredSlots(mentor);
    await createBooking(actor(a), { mentorProfileId: mentor.id, startsAt: slot.startsAt, topic: "First" });
    const before = await db.notification.count();
    expect(before).toBe(2); // proves the earlier notification mock was restored
    await expect(createBooking(actor(b), { mentorProfileId: mentor.id, startsAt: slot.startsAt, topic: "Second" })).rejects.toThrow();
    expect(await db.notification.count()).toBe(before);
  });

  it("cancelling a session that has started is refused and notifies nobody", async () => {
    const { mentor } = await createMentor();
    const student = await createUser();
    const b = await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: inHours(-0.1), status: "CONFIRMED" });
    await expect(cancelBooking(actor(student), b.id, {})).rejects.toThrow(/already started/);
    expect(await db.notification.count()).toBe(0);
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("CONFIRMED");
  });
});

describe("health and readiness", () => {
  it("liveness and readiness expose only a status", async () => {
    expect(await (await health()).json()).toEqual({ status: "ok" });
    const res = await ready();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("readiness reports degraded without leaking the error when the database is down", async () => {
    vi.spyOn(db, "$queryRaw").mockRejectedValue(new Error("connect ECONNREFUSED postgres://user:secret@db:5432"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await ready();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "degraded" });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("secret");
  });
});

describe("privacy-safe logging", () => {
  it("keeps ids and codes but drops error messages, emails and unknown fields", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = Object.assign(new Error("duplicate key for jane@example.com token=abc123"), { code: "P2002" });
    logError("booking.test", err, { bookingId: "b1", email: "jane@example.com", token: "abc123" } as never);
    const line = String(spy.mock.calls[0][0]);
    expect(line).toContain("b1");
    expect(line).toContain("P2002");
    for (const leaked of ["jane@example.com", "abc123", "duplicate key"]) expect(line).not.toContain(leaked);
    expect(describeError("string thrown")).toEqual({ errorName: "string" });
  });
});
