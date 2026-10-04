import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { Stat } from "@/components/dashboard/stat";

export default async function AdminAnalyticsPage() {
  await requireRole("ADMIN");
  const now = new Date();
  const thirty = new Date(now.getTime() - 30 * 86400000);
  const sixty = new Date(now.getTime() - 60 * 86400000);

  const [users, newUsers30, newUsers60, bookings30, bookings60, reviews30, bookings30d] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: thirty } } }),
    db.user.count({ where: { createdAt: { gte: sixty, lt: thirty } } }),
    db.booking.count({ where: { createdAt: { gte: thirty } } }),
    db.booking.count({ where: { createdAt: { gte: sixty, lt: thirty } } }),
    db.review.count({ where: { createdAt: { gte: thirty } } }),
    db.booking.findMany({ where: { createdAt: { gte: thirty } }, select: { createdAt: true } }),
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

  const growth = (a: number, b: number) => (b === 0 ? 100 : Math.round(((a - b) / b) * 100));

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total users" value={users.toLocaleString()} />
        <Stat label="New users (30d)" value={newUsers30} trend={{ value: growth(newUsers30, newUsers60) }} />
        <Stat label="Bookings (30d)" value={bookings30} trend={{ value: growth(bookings30, bookings60) }} />
        <Stat label="Reviews (30d)" value={reviews30} />
      </div>
      <Card>
        <CardHeader><CardTitle>Bookings volume</CardTitle></CardHeader>
        <CardContent><AnalyticsChart data={bins} /></CardContent>
      </Card>
    </div>
  );
}
