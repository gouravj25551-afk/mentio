import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { initials, formatDate } from "@/lib/utils";

export default async function AdminUsersPage() {
  await requireRole("ADMIN");
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Users</h1>
      {users.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No users yet.</Card>
      ) : (
      <Card className="divide-y">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-4 p-4">
            <Avatar className="h-10 w-10"><AvatarImage src={u.image ?? undefined} /><AvatarFallback>{initials(u.name)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{u.name ?? u.email}</div>
              <div className="truncate text-xs text-muted-foreground">{u.email}</div>
            </div>
            <Badge variant={u.role === "ADMIN" ? "brand" : u.role === "MENTOR" ? "success" : "secondary"}>{u.role}</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>
          </div>
        ))}
      </Card>
      )}
    </div>
  );
}
