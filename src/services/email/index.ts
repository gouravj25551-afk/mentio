// Mailer abstraction. Production sends through Resend (env validation requires
// RESEND_API_KEY there). Without a key in development, mail is logged to the console.
import { env, isProd, isResendEnabled } from "@/lib/env";

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
    // Bodies can contain single-use links, so only print them outside production.
    // eslint-disable-next-line no-console
    console.log(line, !isProd && msg.text ? `\n${msg.text}` : "");
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
      signal: AbortSignal.timeout(10_000),
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
