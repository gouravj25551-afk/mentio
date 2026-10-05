import { apiCatch, apiOk } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { listNotifications, markAllRead } from "@/features/notifications/service";

export async function GET() {
  try {
    const user = await requireApiUser();
    return apiOk(await listNotifications(user.id));
  } catch (err) {
    return apiCatch(err);
  }
}

export async function POST() {
  try {
    const user = await requireApiUser();
    await markAllRead(user.id);
    return apiOk({ ok: true });
  } catch (err) {
    return apiCatch(err);
  }
}
