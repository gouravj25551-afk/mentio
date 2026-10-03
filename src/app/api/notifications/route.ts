import { auth } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/api";
import { listNotifications, markAllRead } from "@/features/notifications/service";

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHENTICATED", 401);
  const list = await listNotifications(session.user.id);
  return apiOk(list);
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHENTICATED", 401);
  await markAllRead(session.user.id);
  return apiOk({ ok: true });
}
