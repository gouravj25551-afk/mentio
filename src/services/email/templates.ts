// Pure functions that build transactional email content. No I/O, so they are easy to test.
import type { MailMessage } from "./index";

type Content = Pick<MailMessage, "subject" | "text" | "html">;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Join a base URL and a path without doubling slashes. */
export function absoluteUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function formatSessionTime(date: Date) {
  return `${new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)} IST`;
}

function layout(paragraphs: string[], cta?: { label: string; url: string }): Pick<Content, "text" | "html"> {
  const text = [...paragraphs, ...(cta ? [`${cta.label}: ${cta.url}`] : []), "— Mentio"].join("\n\n");
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#111;line-height:1.5">${paragraphs
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("")}${
    cta
      ? `<p><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${escapeHtml(cta.label)}</a></p>`
      : ""
  }<p style="color:#666">— Mentio</p></div>`;
  return { text, html };
}

export function passwordResetEmail(input: { name?: string | null; resetUrl: string }): Content {
  return {
    subject: "Reset your Mentio password",
    ...layout(
      [
        `Hi${input.name ? ` ${input.name}` : ""},`,
        "We got a request to reset your Mentio password. This link works for 1 hour and can be used once.",
        "If you didn't ask for this, you can ignore this email.",
      ],
      { label: "Reset password", url: input.resetUrl }
    ),
  };
}

export function mentorApprovedEmail(input: { name?: string | null; dashboardUrl: string }): Content {
  return {
    subject: "You're approved as a Mentio mentor",
    ...layout(
      [
        `Hi${input.name ? ` ${input.name}` : ""},`,
        "Your mentor application was approved. Finish your public profile and set your availability so students can book you.",
      ],
      { label: "Open your dashboard", url: input.dashboardUrl }
    ),
  };
}

export function mentorRejectedEmail(input: { name?: string | null }): Content {
  return {
    subject: "Update on your Mentio mentor application",
    ...layout([
      `Hi${input.name ? ` ${input.name}` : ""},`,
      "Thanks for applying to mentor on Mentio. We can't approve your application right now.",
      "You're welcome to reply to this email if you'd like to share more about your background.",
    ]),
  };
}

export function bookingConfirmedEmail(input: {
  recipientName?: string | null;
  otherPartyName?: string | null;
  role: "student" | "mentor";
  startsAt: Date;
  topic: string;
  bookingUrl: string;
}): Content {
  const who = input.otherPartyName ?? (input.role === "student" ? "your mentor" : "a student");
  return {
    subject: "Your Mentio session is confirmed",
    ...layout(
      [
        `Hi${input.recipientName ? ` ${input.recipientName}` : ""},`,
        `Your session with ${who} is confirmed for ${formatSessionTime(input.startsAt)}.`,
        `Topic: ${input.topic}`,
      ],
      { label: "View booking", url: input.bookingUrl }
    ),
  };
}

export function bookingCancelledEmail(input: {
  recipientName?: string | null;
  startsAt: Date;
  topic: string;
  reason?: string | null;
  bookingUrl: string;
}): Content {
  return {
    subject: "Your Mentio session was cancelled",
    ...layout(
      [
        `Hi${input.recipientName ? ` ${input.recipientName}` : ""},`,
        `The session scheduled for ${formatSessionTime(input.startsAt)} was cancelled.`,
        `Topic: ${input.topic}`,
        ...(input.reason ? [`Reason: ${input.reason}`] : []),
      ],
      { label: "View booking", url: input.bookingUrl }
    ),
  };
}
