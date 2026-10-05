import bcrypt from "bcryptjs";
import type { MentorStatus, Role, Weekday } from "@prisma/client";
import { db } from "@/lib/db";

let counter = 0;
const uid = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export const PASSWORD = "Passw0rdOK";
// Cost 4 keeps the suite fast; production hashing uses cost 12 (src/lib/auth/password.ts).
const hash = bcrypt.hashSync(PASSWORD, 4);

export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function createUser(opts: { role?: Role; email?: string; verified?: boolean; name?: string } = {}) {
  const id = uid();
  return db.user.create({
    data: {
      email: opts.email ?? `user-${id}@example.com`,
      name: opts.name ?? `User ${id}`,
      role: opts.role ?? "STUDENT",
      passwordHash: hash,
      emailVerified: opts.verified === false ? null : new Date(),
      profile: { create: { timezone: "UTC" } },
    },
  });
}

export async function createMentor(
  opts: {
    status?: MentorStatus;
    rateCents?: number;
    sessionLength?: number;
    timezone?: string;
    acceptingBookings?: boolean;
    /** Weekly windows. Defaults to every day 00:00-24:00 so tests aren't day-of-week dependent. */
    windows?: { weekday: Weekday; startMinutes: number; endMinutes: number }[];
  } = {},
) {
  const user = await createUser({ role: "MENTOR" });
  const id = uid();
  const mentor = await db.mentorProfile.create({
    data: {
      userId: user.id,
      slug: `mentor-${id}`,
      headline: "Senior engineer and mentor",
      bio: "I help students break into open source and land their first engineering roles.",
      experience: "Ten years building and shipping production software at scale.",
      status: opts.status ?? "APPROVED",
      rateCents: opts.rateCents ?? 0,
      sessionLength: opts.sessionLength ?? 30,
      timezone: opts.timezone ?? "UTC",
      acceptingBookings: opts.acceptingBookings ?? true,
    },
  });
  const days: Weekday[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const windows = opts.windows ?? days.map((weekday) => ({ weekday, startMinutes: 0, endMinutes: 1440 }));
  await db.availability.createMany({ data: windows.map((w) => ({ ...w, mentorProfileId: mentor.id })) });
  return { user, mentor };
}

export const inHours = (h: number) => new Date(Date.now() + h * 3_600_000);

import type { CurrentUser } from "@/lib/auth/guards";
import { getAvailableSlots } from "@/features/bookings/slots";

export const actor = (user: { id: string; name: string | null; email: string; role: Role; image?: string | null }): CurrentUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image ?? null,
  role: user.role,
  timezone: "UTC",
});

/** The first `n` slots a mentor really offers (so tests book through the same rules as users). */
export async function offeredSlots(mentor: { id: string; status: string; acceptingBookings: boolean; sessionLength: number; timezone: string }, n = 5) {
  const slots = await getAvailableSlots({ ...mentor, days: 14 });
  if (slots.length < n) throw new Error(`Expected at least ${n} slots, got ${slots.length}`);
  return slots.slice(0, n);
}

/** Inserts a booking directly (bypassing the rules) for arranging test state. */
export async function insertBooking(opts: {
  studentId: string;
  mentorProfileId: string;
  startsAt: Date;
  minutes?: number;
  status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
}) {
  return db.booking.create({
    data: {
      studentId: opts.studentId,
      mentorProfileId: opts.mentorProfileId,
      startsAt: opts.startsAt,
      endsAt: new Date(opts.startsAt.getTime() + (opts.minutes ?? 30) * 60_000),
      status: opts.status ?? "CONFIRMED",
      topic: "Seeded topic",
      paymentStatus: "NOT_REQUIRED",
    },
  });
}
