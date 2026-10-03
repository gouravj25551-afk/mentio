// Mailer abstraction. Swap this for Resend, Postmark, SES, etc. without
// touching callers. In dev, we log to the console.
import { env, isResendEnabled } from "@/lib/env";

export interface MailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface Mailer {
  send(msg: MailMessage): Promise<{ id?: string }>;
}

class ConsoleMailer implements Mailer {
  async send(msg: MailMessage) {
    const line = `[email] → ${msg.to} · ${msg.subject}`;
    // eslint-disable-next-line no-console
    console.log(line, msg.text ? `\n${msg.text}` : "");
    return { id: `console-${Date.now()}` };
  }
}

class ResendMailer implements Mailer {
  constructor(private apiKey: string) {}
  async send(msg: MailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }
    const json = (await res.json()) as { id?: string };
    return { id: json.id };
  }
}

export const mailer: Mailer = isResendEnabled
  ? new ResendMailer(env.RESEND_API_KEY!)
  : new ConsoleMailer();
