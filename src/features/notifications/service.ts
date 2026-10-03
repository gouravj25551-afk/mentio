import "server-only";
import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";
import { mailer } from "@/services/email";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  const notif = await db.notification.create({ data: input });
  // fan-out to email channel (no-op in dev unless RESEND_API_KEY is set)
  const user = await db.user.findUnique({ where: { id: input.userId }, select: { email: true, name: true } });
  if (user?.email) {
    await mailer.send({
      to: user.email,
      subject: input.title,
      text: `${input.body ?? ""}${input.link ? `\n\n${process.env.NEXT_PUBLIC_APP_URL ?? ""}${input.link}` : ""}`.trim(),
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
