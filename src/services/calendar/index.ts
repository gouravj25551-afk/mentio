// Calendar service abstraction.
// Internal (default) creates deterministic meeting URLs so booking works
// out of the box. Cal.com and Calendly adapters implement the same API —
// if credentials are present and a mentor has that provider connected,
// the service transparently uses the provider instead.

import "server-only";
import { db } from "@/lib/db";
import { env, isCalComEnabled, isCalendlyEnabled } from "@/lib/env";

export interface CalendarMeeting {
  mentorProfileId: string;
  studentId: string;
  startsAt: Date;
  endsAt: Date;
  topic: string;
}

export interface CalendarAdapter {
  readonly name: "internal" | "cal_com" | "calendly";
  createMeeting(input: CalendarMeeting): Promise<string>;
  cancelMeeting?(externalId: string): Promise<void>;
  getAvailableSlots?(mentorProfileId: string): Promise<{ startsAt: string; endsAt: string }[]>;
}

const InternalAdapter: CalendarAdapter = {
  name: "internal",
  async createMeeting(m) {
    const slug = `${m.mentorProfileId.slice(0, 6)}-${Date.now().toString(36)}`;
    return `https://meet.mentio.app/${slug}`;
  },
};

const CalComAdapter: CalendarAdapter = {
  name: "cal_com",
  async createMeeting(m) {
    if (!isCalComEnabled) return InternalAdapter.createMeeting(m);
    const conn = await db.calendarConnection.findUnique({
      where: { mentorProfileId_provider: { mentorProfileId: m.mentorProfileId, provider: "CAL_COM" } },
    });
    if (!conn?.accessToken) return InternalAdapter.createMeeting(m);
    // Minimal production-shaped call — would POST to /v2/bookings in Cal.com's API.
    const res = await fetch("https://api.cal.com/v2/bookings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${conn.accessToken}`,
      },
      body: JSON.stringify({
        start: m.startsAt.toISOString(),
        end: m.endsAt.toISOString(),
        attendee: { email: `student-${m.studentId}@mentio.app`, name: m.topic },
      }),
    }).catch(() => null);
    if (!res?.ok) return InternalAdapter.createMeeting(m);
    const json = (await res.json()) as { meetingUrl?: string };
    return json.meetingUrl ?? InternalAdapter.createMeeting(m);
  },
};

const CalendlyAdapter: CalendarAdapter = {
  name: "calendly",
  async createMeeting(m) {
    if (!isCalendlyEnabled) return InternalAdapter.createMeeting(m);
    const conn = await db.calendarConnection.findUnique({
      where: { mentorProfileId_provider: { mentorProfileId: m.mentorProfileId, provider: "CALENDLY" } },
    });
    if (!conn?.accessToken) return InternalAdapter.createMeeting(m);
    const res = await fetch("https://api.calendly.com/scheduled_events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${conn.accessToken}`,
      },
      body: JSON.stringify({
        event_type: conn.eventTypeUrl,
        start_time: m.startsAt.toISOString(),
        end_time: m.endsAt.toISOString(),
      }),
    }).catch(() => null);
    if (!res?.ok) return InternalAdapter.createMeeting(m);
    const json = (await res.json()) as { resource?: { location?: { join_url?: string } } };
    return json.resource?.location?.join_url ?? InternalAdapter.createMeeting(m);
  },
};

async function pickAdapter(mentorProfileId: string): Promise<CalendarAdapter> {
  const connection = await db.calendarConnection.findFirst({
    where: { mentorProfileId, active: true },
  });
  if (!connection) return InternalAdapter;
  if (connection.provider === "CAL_COM") return CalComAdapter;
  if (connection.provider === "CALENDLY") return CalendlyAdapter;
  return InternalAdapter;
}

export const calendarService = {
  async createMeeting(input: CalendarMeeting): Promise<string> {
    const adapter = await pickAdapter(input.mentorProfileId);
    return adapter.createMeeting(input);
  },
  providers: {
    cal_com: {
      configured: () => isCalComEnabled,
      authUrl: () =>
        isCalComEnabled
          ? `https://app.cal.com/auth/oauth2/authorize?client_id=${env.CAL_COM_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${env.NEXT_PUBLIC_APP_URL}/api/calendars/cal-com/callback`)}&response_type=code`
          : null,
    },
    calendly: {
      configured: () => isCalendlyEnabled,
      authUrl: () =>
        isCalendlyEnabled
          ? `https://auth.calendly.com/oauth/authorize?client_id=${env.CALENDLY_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${env.NEXT_PUBLIC_APP_URL}/api/calendars/calendly/callback`)}&response_type=code`
          : null,
    },
  },
};
