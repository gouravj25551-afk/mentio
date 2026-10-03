import { requireUser } from "@/lib/auth/guards";
import { DashboardShell } from "@/components/dashboard/shell";
import { db } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  return (
    <DashboardShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      }}
      unread={unread}
    >
      {children}
    </DashboardShell>
  );
}
