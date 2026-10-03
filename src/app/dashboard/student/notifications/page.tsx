import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { listNotifications, markAllRead } from "@/features/notifications/service";
import { Card } from "@/components/ui/card";
import { formatRelative } from "@/lib/utils";
import { Bell } from "lucide-react";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const list = await listNotifications(user.id, { take: 100 });
  // mark read on view
  await markAllRead(user.id);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Booking updates, reviews, and system messages.</p>
      </div>
      {list.length === 0 ? (
        <Empty icon={<Bell className="h-5 w-5" />} title="You're all caught up" description="Notifications about your bookings and reviews land here." />
      ) : (
        <Card className="divide-y">
          {list.map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-4 p-5">
              <div>
                <div className="font-medium">{n.title}</div>
                {n.body ? <div className="mt-1 text-sm text-muted-foreground">{n.body}</div> : null}
                <div className="mt-1 text-xs text-muted-foreground">{formatRelative(n.createdAt)}</div>
              </div>
              {n.link ? <Button asChild variant="outline" size="sm"><Link href={n.link}>Open</Link></Button> : null}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
