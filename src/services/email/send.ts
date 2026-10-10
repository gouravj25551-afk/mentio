import "server-only";
import { logEvent } from "@/lib/log";
import { mailer, type MailMessage } from "./index";

/**
 * Sends an email and never throws. Use after the database work has already
 * succeeded: a mail failure is logged, not propagated, so it can't undo a booking.
 * Only the label and a redacted error are logged, never the body or recipient (the body may hold a reset link).
 */
export async function sendEmailSafely(label: string, msg: MailMessage): Promise<boolean> {
  try {
    await mailer.send(msg);
    return true;
  } catch (err) {
    logEvent("email", "delivery_failed", { label, error: err instanceof Error ? err : "unknown" });
    return false;
  }
}
