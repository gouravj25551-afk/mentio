import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/utils";

export default async function AdminBookingsPage() {
  await requireRole("ADMIN");
  const bookings = await db.booking.findMany({
    include: { student: true, mentorProfile: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Bookings</h1>
      {bookings.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No bookings yet.</Card>
      ) : (
      <Card className="divide-y">
        {bookings.map((b) => (
          <div key={b.id} className="grid grid-cols-1 gap-2 p-4 text-sm sm:grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] sm:items-center">
            <div><div className="font-medium">{b.student.name}</div><div className="text-xs text-muted-foreground">{b.student.email}</div></div>
            <div><div className="font-medium">{b.mentorProfile.user.name}</div><div className="text-xs text-muted-foreground">{b.topic}</div></div>
            <div>{formatDate(b.startsAt)}</div>
            <div className="text-xs text-muted-foreground">{formatTime(b.startsAt)}</div>
            <Badge variant={b.status === "CONFIRMED" ? "success" : b.status === "CANCELLED" ? "destructive" : "secondary"}>{b.status}</Badge>
          </div>
        ))}
      </Card>
      )}
    </div>
  );
}
