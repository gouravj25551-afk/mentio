import "server-only";
import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";
import { logError } from "@/lib/log";
import { appUrl, sendEmailSafely } from "@/services/email";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  const notif = await db.notification.create({ data: input });
  // Email is best-effort: a mail outage must never fail the booking that triggered it.
  const user = await db.user.findUnique({ where: { id: input.userId }, select: { email: true } });
  if (user?.email) {
    await sendEmailSafely({
      to: user.email,
      subject: input.title,
      text: `${input.body ?? ""}${input.link ? `\n\n${appUrl(input.link)}` : ""}`.trim() || input.title,
    });
  }
  return notif;
}

/**
 * For use AFTER the business change is committed. A failed notification must not
 * turn an already-saved booking or moderation into an error response (the user
 * would retry and hit "slot taken"), so failures are logged and swallowed.
 */
export async function notifySafely(input: Parameters<typeof createNotification>[0]) {
  try {
    await createNotification(input);
  } catch (err) {
    logError("notification.failed", err, { userId: input.userId, code: input.type });
  }
}

export async function listNotifications(userId: string, opts?: { unreadOnly?: boolean; take?: number }) {
  return db.notification.findMany({
    where: { userId, ...(opts?.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts?.take ?? 25,
  });
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markRead(userId: string, id: string) {
  await db.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
}
