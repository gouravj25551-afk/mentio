import "server-only";
import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";
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
