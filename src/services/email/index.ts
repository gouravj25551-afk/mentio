// Mailer abstraction. Production requires Resend (enforced in src/lib/env.ts);
// development and tests log to the console.
import { env, isResendEnabled } from "@/lib/env";
import { logEvent } from "@/lib/log";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  send(msg: MailMessage): Promise<{ id?: string }>;
}

class ConsoleMailer implements Mailer {
  async send(msg: MailMessage) {
    // Development only: prints links (including one-time tokens) so flows can be tested locally.
    // Refuse in production so a missing key can never write tokens into the logs.
    if (process.env.NODE_ENV === "production") throw new Error("No email provider configured");
    console.log(`[email] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return { id: `console-${Date.now()}` };
  }
}

class ResendMailer implements Mailer {
  constructor(private apiKey: string) {}
  async send(msg: MailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Status only: the body can echo recipient addresses and message content.
      throw new Error(`Resend responded with HTTP ${res.status}`);
    }
    const json = (await res.json()) as { id?: string };
    return { id: json.id };
  }
}

export const mailer: Mailer = isResendEnabled ? new ResendMailer(env.RESEND_API_KEY!) : new ConsoleMailer();

/** Absolute URL for a path, used in emails. */
export const appUrl = (path: string) => `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${path}`;

/**
 * Sends a transactional email and swallows failures (after logging them).
 * Use where the caller must not fail or leak anything if delivery fails.
 */
export async function sendEmailSafely(msg: MailMessage): Promise<boolean> {
  try {
    await mailer.send(msg);
    return true;
  } catch (err) {
    logEvent("email", "delivery_failed", { error: err instanceof Error ? err : "unknown" });
    return false;
  }
}
