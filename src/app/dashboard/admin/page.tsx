import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Stat } from "@/components/dashboard/stat";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Calendar, Star } from "lucide-react";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";

export default async function AdminOverview() {
  await requireRole("ADMIN");
  const now = new Date();
  const thirty = new Date(now.getTime() - 30 * 86400000);
  const [users, , approvedMentors, pendingMentors, bookings, bookings30d, avgRating] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "MENTOR" } }),
    db.mentorProfile.count({ where: { status: "APPROVED" } }),
    db.mentorProfile.count({ where: { status: "PENDING" } }),
    db.booking.count(),
    db.booking.findMany({ where: { createdAt: { gte: thirty } }, select: { createdAt: true } }),
    db.mentorProfile.aggregate({ _avg: { averageRating: true } }),
  ]);
  const bins: { day: string; bookings: number; revenue: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    bins.push({ day: d.toISOString().slice(0, 10), bookings: 0, revenue: 0 });
  }
  const byDay = new Map(bins.map((b) => [b.day, b]));
  for (const b of bookings30d) {
    const row = byDay.get(b.createdAt.toISOString().slice(0, 10));
    if (row) row.bookings += 1;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Admin overview</h1>
        <p className="text-sm text-muted-foreground">Platform health at a glance.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={users.toLocaleString()} icon={<Users className="h-4 w-4 text-indigo-500" />} />
        <Stat label="Approved mentors" value={approvedMentors} hint={`${pendingMentors} pending`} icon={<UserCheck className="h-4 w-4 text-indigo-500" />} />
        <Stat label="Total bookings" value={bookings.toLocaleString()} icon={<Calendar className="h-4 w-4 text-indigo-500" />} />
        <Stat label="Avg mentor rating" value={(avgRating._avg.averageRating ?? 0).toFixed(2)} icon={<Star className="h-4 w-4 text-indigo-500" />} />
      </div>
      <Card>
        <CardHeader><CardTitle>New bookings (30d)</CardTitle></CardHeader>
        <CardContent><AnalyticsChart data={bins} /></CardContent>
      </Card>
    </div>
  );
}
