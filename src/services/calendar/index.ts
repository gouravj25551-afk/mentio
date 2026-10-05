// Calendar / meeting-link service.
//
// What this does and does NOT do:
//  - It resolves a meeting URL for a booking: either the mentor's own validated
//    link (kind EXTERNAL_LINK) or a freshly generated, unguessable video room
//    (kind INTERNAL_ROOM). Neither needs a network call, so booking cannot fail
//    because a third party is down.
//  - It does NOT create events in Cal.com or Calendly. Those APIs are not
//    integrated, and nothing here may claim otherwise.
import "server-only";
import crypto from "node:crypto";
import type { MeetingKind } from "@prisma/client";

import { validateMeetingLink } from "@/lib/meeting-links";

export type ResolvedMeeting = { url: string; kind: MeetingKind };

/** A new public video room. The 96-bit random name makes the URL unguessable. */
export function generateRoomUrl() {
  return `https://meet.jit.si/mentio-${crypto.randomBytes(12).toString("hex")}`;
}

export function resolveMeeting(mentor: { meetingLink: string | null }): ResolvedMeeting {
  if (mentor.meetingLink) {
    // Re-validated at booking time in case the allow-list tightened since it was saved.
    const checked = validateMeetingLink(mentor.meetingLink);
    if (checked.ok) return { url: checked.url, kind: "EXTERNAL_LINK" };
  }
  return { url: generateRoomUrl(), kind: "INTERNAL_ROOM" };
}

export const meetingKindLabel: Record<MeetingKind, string> = {
  INTERNAL_ROOM: "Video room created by Mentio",
  EXTERNAL_LINK: "Mentor's own meeting link",
};
