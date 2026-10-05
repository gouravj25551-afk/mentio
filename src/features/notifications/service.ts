import "server-only";
import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  // In-app only. Transactional emails are sent explicitly by the caller (see services/email/templates).
  return db.notification.create({ data: input });
}

/** In-app notification that must never break the caller's already-committed work. */
export async function createNotificationSafely(input: Parameters<typeof createNotification>[0]) {
  try {
    await createNotification(input);
  } catch (err) {
    console.error("[notification] create failed:", err instanceof Error ? err.message : "unknown error");
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
