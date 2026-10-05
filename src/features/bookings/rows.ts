import "server-only";
import type { BookingStatus, MeetingKind, Prisma } from "@prisma/client";

import { ACTIVE_STATUSES } from "@/lib/booking-rules";
import { publicUser } from "@/lib/public-select";

/** The booking fields a dashboard needs. Nothing else is serialized to the browser. */
export const bookingRowSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  status: true,
  topic: true,
  notes: true,
  meetingUrl: true,
  meetingKind: true,
  cancelReason: true,
  studentId: true,
  student: { select: publicUser },
  mentorProfile: { select: { slug: true, userId: true, user: { select: publicUser } } },
  review: { select: { rating: true } },
} satisfies Prisma.BookingSelect;

type Row = Prisma.BookingGetPayload<{ select: typeof bookingRowSelect }>;

export type BookingRowData = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  topic: string;
  notes: string | null;
  meetingUrl: string | null;
  meetingKind: MeetingKind;
  cancelReason: string | null;
  mentorSlug: string;
  /** The other party in the conversation, from the viewer's point of view. */
  counterpart: { name: string | null; image: string | null };
  rating: number | null;
  /** What the viewer may do. Computed here from the same rules the API enforces. */
  can: { join: boolean; cancel: boolean; reschedule: boolean; complete: boolean; review: boolean };
};

/** Shapes a booking for a viewer and works out which actions are currently allowed. */
export function toBookingRow(b: Row, viewer: { id: string; role: "STUDENT" | "MENTOR" | "ADMIN" }, now = new Date()): BookingRowData {
  const isStudent = b.studentId === viewer.id;
  const isMentor = b.mentorProfile.userId === viewer.id;
  const active = ACTIVE_STATUSES.includes(b.status);
  const future = b.startsAt > now;
  const ended = b.endsAt <= now;
  const other = isStudent ? b.mentorProfile.user : b.student;

  return {
    id: b.id,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    status: b.status,
    topic: b.topic,
    notes: b.notes,
    meetingUrl: b.meetingUrl,
    meetingKind: b.meetingKind,
    cancelReason: b.cancelReason,
    mentorSlug: b.mentorProfile.slug,
    counterpart: { name: other.name, image: other.image },
    rating: b.review?.rating ?? null,
    can: {
      join: b.status === "CONFIRMED" && !ended && Boolean(b.meetingUrl),
      cancel: active && future && (isStudent || isMentor || viewer.role === "ADMIN"),
      reschedule: active && future && isStudent,
      complete: b.status === "CONFIRMED" && ended && (isMentor || viewer.role === "ADMIN"),
      review: isStudent && b.status === "COMPLETED",
    },
  };
}
