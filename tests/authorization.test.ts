import { beforeEach, describe, expect, it } from "vitest";

import { PUT as putAvailability } from "@/app/api/mentors/me/availability/route";
import { PUT as putMeetingLink } from "@/app/api/mentors/me/meeting-link/route";
import { PUT as putMentorProfile } from "@/app/api/mentors/me/profile/route";
import { POST as moderate } from "@/app/api/admin/mentors/[id]/moderate/route";
import { GET as getBookings, POST as postBooking } from "@/app/api/bookings/route";
import { POST as postCancel } from "@/app/api/bookings/[id]/cancel/route";
import { POST as postComplete } from "@/app/api/bookings/[id]/complete/route";
import { POST as postReschedule } from "@/app/api/bookings/[id]/reschedule/route";
import { GET as getSaved, POST as postSaved } from "@/app/api/me/saved/route";
import { POST as postReview } from "@/app/api/reviews/route";
import { GET as getSlots } from "@/app/api/mentors/[slug]/slots/route";
import { getCurrentUser, requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { createMentor, createUser, insertBooking, inHours, offeredSlots, resetDb } from "./helpers/factories";
import { signInAs } from "./helpers/state";

const json = (body: unknown, method = "POST") =>
  new Request("http://localhost/api/x", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

beforeEach(async () => {
  await resetDb();
});

describe("unauthenticated callers", () => {
  it("get 401 from every protected API handler", async () => {
    signInAs(null);
    const { mentor } = await createMentor();
    const responses = await Promise.all([
      getBookings(),
      postBooking(json({})),
      postCancel(json({}), params({ id: "x" })),
      postReschedule(json({}), params({ id: "x" })),
      postComplete(json({}), params({ id: "x" })),
      postReview(json({})),
      getSaved(),
      postSaved(json({})),
      putAvailability(json({ slots: [] })),
      putMentorProfile(json({})),
      putMeetingLink(json({ meetingLink: "" })),
      moderate(json({ action: "APPROVE" }), params({ id: mentor.id })),
    ]);
    expect(responses.map((r) => r.status)).toEqual(Array(responses.length).fill(401));
  });
});

describe("students cannot perform mentor or admin actions", () => {
  it("get 403 on mentor and admin endpoints", async () => {
    const { mentor } = await createMentor({ status: "PENDING" });
    const student = await createUser();
    signInAs(student.id);

    expect((await putAvailability(json({ slots: [] }))).status).toBe(403);
    expect((await putMentorProfile(json({}))).status).toBe(403);
    expect((await putMeetingLink(json({ meetingLink: "" }))).status).toBe(403);
    expect((await moderate(json({ action: "APPROVE" }), params({ id: mentor.id }))).status).toBe(403);
    expect((await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } })).status).toBe("PENDING");
  });
});

describe("mentors cannot perform admin or student actions", () => {
  it("cannot moderate (including approving themselves), book, review or save", async () => {
    const { mentor, user } = await createMentor({ status: "PENDING" });
    signInAs(user.id);
    expect((await moderate(json({ action: "APPROVE" }), params({ id: mentor.id }))).status).toBe(403);
    expect((await postBooking(json({ mentorProfileId: mentor.id, startsAt: new Date().toISOString(), topic: "hi" }))).status).toBe(403);
    expect((await postReview(json({ bookingId: "x", rating: 5 }))).status).toBe(403);
    expect((await postSaved(json({ mentorProfileId: mentor.id }))).status).toBe(403);
    expect((await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } })).status).toBe("PENDING");
  });
});

describe("role is read from the database, not the (possibly stale) session", () => {
  it("a demoted admin loses access immediately", async () => {
    const { mentor } = await createMentor({ status: "PENDING" });
    const admin = await createUser({ role: "ADMIN" });
    signInAs(admin.id);
    expect((await moderate(json({ action: "FEATURE" }), params({ id: mentor.id }))).status).not.toBe(403);
    await db.user.update({ where: { id: admin.id }, data: { role: "STUDENT" } });
    expect((await moderate(json({ action: "FEATURE" }), params({ id: mentor.id }))).status).toBe(403);
    await expect(requireRole("ADMIN")).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("a deleted user's old session is treated as signed out", async () => {
    const user = await createUser();
    signInAs(user.id);
    await db.user.delete({ where: { id: user.id } });
    expect(await getCurrentUser()).toBeNull();
    expect((await getBookings()).status).toBe(401);
  });
});

describe("admin moderation", () => {
  it("approves a complete profile, records the action, and notifies the mentor", async () => {
    const { mentor, user } = await createMentor({ status: "PENDING" });
    const category = await db.category.create({ data: { slug: "c", name: "C" } });
    await db.mentorCategory.create({ data: { mentorProfileId: mentor.id, categoryId: category.id } });
    const admin = await createUser({ role: "ADMIN" });
    signInAs(admin.id);

    const res = await moderate(json({ action: "APPROVE" }), params({ id: mentor.id }));
    expect(res.status).toBe(200);
    expect((await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } })).status).toBe("APPROVED");
    expect(await db.adminAction.count({ where: { actorId: admin.id, targetId: user.id, type: "APPROVE_MENTOR" } })).toBe(1);
    expect((await db.notification.findFirstOrThrow({ where: { userId: user.id } })).type).toBe("MENTOR_APPROVED");
  });

  it("refuses to approve the empty placeholder profile created at sign-up", async () => {
    const { mentor } = await createMentor({ status: "PENDING" });
    await db.mentorProfile.update({ where: { id: mentor.id }, data: { bio: "", experience: "" } });
    signInAs((await createUser({ role: "ADMIN" })).id);
    const res = await moderate(json({ action: "APPROVE" }), params({ id: mentor.id }));
    expect(res.status).toBe(409);
    expect((await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } })).status).toBe("PENDING");
  });

  it("rejection and suspension stop new bookings, and unknown actions are refused", async () => {
    const { mentor } = await createMentor();
    const admin = await createUser({ role: "ADMIN" });
    signInAs(admin.id);
    expect((await moderate(json({ action: "DROP TABLE" }), params({ id: mentor.id }))).status).toBe(422);
    expect((await moderate(json({ action: "SUSPEND", reason: "Complaint" }), params({ id: mentor.id }))).status).toBe(200);

    const student = await createUser();
    signInAs(student.id);
    const slug = (await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } })).slug;
    expect((await getSlots(new Request("http://localhost/x"), params({ slug }))).status).toBe(404);
    const res = await postBooking(json({ mentorProfileId: mentor.id, startsAt: inHours(5).toISOString(), topic: "hi" }));
    expect(res.status).toBe(404);
  });

  it("moderating a mentor that doesn't exist is a 404", async () => {
    signInAs((await createUser({ role: "ADMIN" })).id);
    expect((await moderate(json({ action: "APPROVE" }), params({ id: "nope" }))).status).toBe(404);
  });
});

describe("IDOR: other people's bookings", () => {
  it("a stranger can't cancel, reschedule, complete or review someone else's booking", async () => {
    const { mentor } = await createMentor();
    const owner = await createUser();
    const stranger = await createUser();
    const strangerMentor = await createMentor();
    const ended = await insertBooking({ studentId: owner.id, mentorProfileId: mentor.id, startsAt: inHours(-3) });
    const [slot] = await offeredSlots(mentor);
    const future = await insertBooking({ studentId: owner.id, mentorProfileId: mentor.id, startsAt: new Date(slot.startsAt) });

    for (const who of [stranger.id, strangerMentor.user.id]) {
      signInAs(who);
      expect((await postCancel(json({}), params({ id: future.id }))).status).toBe(404);
      expect((await postReschedule(json({ startsAt: slot.endsAt }), params({ id: future.id }))).status).toBe(404);
      expect((await postComplete(json({}), params({ id: ended.id }))).status).toBe(404);
    }
    signInAs(stranger.id);
    expect((await postReview(json({ bookingId: ended.id, rating: 1 }))).status).toBe(404);
    expect((await db.booking.findUniqueOrThrow({ where: { id: future.id } })).status).toBe("CONFIRMED");
  });
});

describe("data exposure", () => {
  it("booking and saved-mentor APIs never return password hashes or other people's emails", async () => {
    const { mentor, user: mentorUser } = await createMentor();
    const student = await createUser();
    await insertBooking({ studentId: student.id, mentorProfileId: mentor.id, startsAt: inHours(48) });
    await db.savedMentor.create({ data: { userId: student.id, mentorProfileId: mentor.id } });

    signInAs(student.id);
    const bookings = JSON.stringify(await (await getBookings()).json());
    const saved = JSON.stringify(await (await getSaved()).json());
    for (const body of [bookings, saved]) {
      expect(body).not.toContain("passwordHash");
      expect(body).not.toContain("$2"); // bcrypt prefix
      expect(body).not.toContain(mentorUser.email);
    }

    // The mentor sees the student's name/email for their own booking, but no hash.
    signInAs(mentorUser.id);
    const asMentor = JSON.stringify(await (await getBookings()).json());
    expect(asMentor).not.toContain("passwordHash");
    expect(asMentor).not.toContain("$2");
  });

  it("each person only lists their own bookings", async () => {
    const { mentor } = await createMentor();
    const a = await createUser();
    const b = await createUser();
    await insertBooking({ studentId: a.id, mentorProfileId: mentor.id, startsAt: inHours(48) });
    signInAs(b.id);
    expect(await (await getBookings()).json()).toEqual([]);
  });

  it("the passwordHash column is omitted from ordinary queries", async () => {
    const user = await createUser();
    const plain = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect("passwordHash" in plain).toBe(false);
    const explicit = await db.user.findUniqueOrThrow({ where: { id: user.id }, omit: { passwordHash: false } });
    expect(explicit.passwordHash).toMatch(/^\$2/);
  });
});

describe("mentor profile input validation", () => {
  const valid = {
    headline: "Senior engineer and mentor",
    bio: "I help students break into open source and land their first engineering roles.",
    experience: "Ten years building and shipping production software at scale.",
    rateCents: 0,
    timezone: "Asia/Kolkata",
    sessionLength: 45,
    responseTimeHrs: 12,
    skillIds: [] as string[],
    achievements: ["Spoke at PyCon"],
    portfolio: ["https://github.com/example"],
    verificationUrl: "https://www.linkedin.com/in/example",
    acceptingBookings: true,
  };

  it("saves a valid profile, and a rejected mentor who edits goes back to PENDING", async () => {
    const { user, mentor } = await createMentor({ status: "REJECTED" });
    const category = await db.category.create({ data: { slug: "oss", name: "Open Source" } });
    signInAs(user.id);
    const res = await putMentorProfile(json({ ...valid, categoryIds: [category.id] }, "PUT"));
    expect(res.status).toBe(200);
    const saved = await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id }, include: { categories: true } });
    expect(saved).toMatchObject({ status: "PENDING", sessionLength: 45, timezone: "Asia/Kolkata", responseTimeHrs: 12 });
    expect(saved.categories).toHaveLength(1);
  });

  it("a suspended mentor stays suspended after editing", async () => {
    const { user, mentor } = await createMentor({ status: "SUSPENDED" });
    const category = await db.category.create({ data: { slug: "oss", name: "Open Source" } });
    signInAs(user.id);
    await putMentorProfile(json({ ...valid, categoryIds: [category.id] }, "PUT"));
    expect((await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } })).status).toBe("SUSPENDED");
  });

  it.each([
    ["javascript: portfolio link", { portfolio: ["javascript:alert(1)"] }],
    ["http portfolio link", { portfolio: ["http://example.com"] }],
    ["a price during the beta", { rateCents: 5000 }],
    ["an invalid timezone", { timezone: "Mars/Olympus" }],
    ["a too-short bio", { bio: "short" }],
    ["session length out of range", { sessionLength: 5 }],
    ["no categories", { categoryIds: [] }],
  ])("rejects %s with a 422 and saves nothing", async (_name, patch) => {
    const { user, mentor } = await createMentor();
    const category = await db.category.create({ data: { slug: "oss", name: "Open Source" } });
    signInAs(user.id);
    const res = await putMentorProfile(json({ ...valid, categoryIds: [category.id], ...patch }, "PUT"));
    expect(res.status).toBe(422);
    expect((await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } })).headline).toBe("Senior engineer and mentor");
  });

  it("an unknown category id is a clean 422, not a 500", async () => {
    const { user } = await createMentor();
    signInAs(user.id);
    expect((await putMentorProfile(json({ ...valid, categoryIds: ["ghost"] }, "PUT"))).status).toBe(422);
  });

  it("malformed JSON is a 400, not a 500", async () => {
    const { user } = await createMentor();
    signInAs(user.id);
    const res = await putMentorProfile(new Request("http://localhost/x", { method: "PUT", body: "{not json" }));
    expect(res.status).toBe(400);
  });
});

describe("availability validation", () => {
  it("saves a valid week and rejects overlapping, inverted and off-grid windows", async () => {
    const { user, mentor } = await createMentor({ windows: [] });
    signInAs(user.id);
    const ok = await putAvailability(json({ slots: [{ weekday: "MON", startMinutes: 540, endMinutes: 1020 }] }, "PUT"));
    expect(ok.status).toBe(200);
    expect(await db.availability.count({ where: { mentorProfileId: mentor.id } })).toBe(1);

    for (const slots of [
      [{ weekday: "MON", startMinutes: 600, endMinutes: 540 }],
      [{ weekday: "MON", startMinutes: 541, endMinutes: 600 }],
      [{ weekday: "MON", startMinutes: 540, endMinutes: 660 }, { weekday: "MON", startMinutes: 600, endMinutes: 720 }],
      [{ weekday: "FUNDAY", startMinutes: 540, endMinutes: 600 }],
    ]) {
      expect((await putAvailability(json({ slots }, "PUT"))).status).toBe(422);
    }
    // A failed save does not wipe the previous availability.
    expect(await db.availability.count({ where: { mentorProfileId: mentor.id } })).toBe(1);
  });
});

describe("public slots API", () => {
  it("returns slots with the mentor's timezone for an approved mentor", async () => {
    const { mentor } = await createMentor({ timezone: "Asia/Kolkata" });
    const res = await getSlots(new Request("http://localhost/x"), params({ slug: mentor.slug }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.timezone).toBe("Asia/Kolkata");
    expect(body.slots.length).toBeGreaterThan(0);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns nothing for a mentor who stopped accepting bookings", async () => {
    const { mentor } = await createMentor({ acceptingBookings: false });
    const body = await (await getSlots(new Request("http://localhost/x"), params({ slug: mentor.slug }))).json();
    expect(body.slots).toEqual([]);
  });
});
