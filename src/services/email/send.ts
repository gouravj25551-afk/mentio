import "server-only";
import { mailer, type MailMessage } from "./index";

/**
 * Sends an email and never throws. Use after the database work has already
 * succeeded: a mail failure is logged, not propagated, so it can't undo a booking.
 * Only the label, recipient and error message are logged, never the body (it may hold a reset link).
 */
export async function sendEmailSafely(label: string, msg: MailMessage): Promise<boolean> {
  try {
    await mailer.send(msg);
    return true;
  } catch (err) {
    console.error(`[email] ${label} to ${msg.to} failed:`, err instanceof Error ? err.message : "unknown error");
    return false;
  }
}
