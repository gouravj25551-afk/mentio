// Validation for the mentor-supplied meeting / scheduling URL.
//
// Students are shown this as a "Join" link, so an arbitrary URL would let a
// mentor point them at a phishing page. Only https links on well-known meeting
// and scheduling hosts (or their subdomains) are accepted.
const ALLOWED_HOSTS = [
  "zoom.us",
  "meet.google.com",
  "teams.microsoft.com",
  "teams.live.com",
  "whereby.com",
  "meet.jit.si",
  "cal.com",
  "calendly.com",
];

export const ALLOWED_MEETING_HOSTS = ALLOWED_HOSTS;

export type MeetingLinkResult = { ok: true; url: string } | { ok: false; error: string };

export function validateMeetingLink(raw: string): MeetingLinkResult {
  const value = raw.trim();
  if (value.length > 300) return { ok: false, error: "That link is too long." };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "Enter a full link starting with https://" };
  }
  if (url.protocol !== "https:") return { ok: false, error: "The link must start with https://" };
  if (url.username || url.password) return { ok: false, error: "The link must not contain a username or password." };
  if (url.port && url.port !== "443") return { ok: false, error: "The link must not use a custom port." };

  const host = url.hostname.toLowerCase();
  const allowed = ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!allowed) {
    return { ok: false, error: `Use a link from ${ALLOWED_HOSTS.join(", ")}.` };
  }
  return { ok: true, url: url.toString() };
}
