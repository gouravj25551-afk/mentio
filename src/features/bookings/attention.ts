import "server-only";
import type { MentorStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { ACTIVE_STATUSES } from "@/lib/booking-rules";

/** Upcoming bookings that are still live although the mentor can no longer take bookings. */
export const affectedBookingsWhere = (mentorProfileId?: string) => ({
  status: { in: ACTIVE_STATUSES },
  startsAt: { gt: new Date() },
  mentorProfile: { status: { in: ["REJECTED", "SUSPENDED"] as MentorStatus[] }, ...(mentorProfileId ? { id: mentorProfileId } : {}) },
});

export const countAffectedBookings = (mentorProfileId?: string) =>
  db.booking.count({ where: affectedBookingsWhere(mentorProfileId) });

export const listAffectedBookings = () =>
  db.booking.findMany({
    where: affectedBookingsWhere(),
    select: {
      id: true, startsAt: true, topic: true, status: true,
      student: { select: { name: true, email: true } },
      mentorProfile: { select: { status: true, user: { select: { name: true } } } },
    },
    orderBy: { startsAt: "asc" },
    take: 100,
  });
