import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Stat } from "@/components/dashboard/stat";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";

export default async function MentorAnalyticsPage() {
  const user = await requireRole(["MENTOR", "ADMIN"]);
  const mentor = await db.mentorProfile.findUnique({ where: { userId: user.id } });
  if (!mentor) return <p className="text-sm text-muted-foreground">Finish onboarding first.</p>;

  const now = new Date();
  const thirty = new Date(now.getTime() - 30 * 86400000);
  const sixty = new Date(now.getTime() - 60 * 86400000);

  const [bookings30, bookings60, bookings30d] = await Promise.all([
    db.booking.count({ where: { mentorProfileId: mentor.id, createdAt: { gte: thirty } } }),
    db.booking.count({ where: { mentorProfileId: mentor.id, createdAt: { gte: sixty, lt: thirty } } }),
    db.booking.findMany({
      where: { mentorProfileId: mentor.id, createdAt: { gte: thirty } },
      select: { createdAt: true, amountCents: true, status: true },
    }),
  ]);

  // bin by day
  const bins: { day: string; bookings: number; revenue: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    bins.push({ day: key, bookings: 0, revenue: 0 });
  }
  const byDay = new Map(bins.map((b) => [b.day, b]));
  for (const b of bookings30d) {
    const key = b.createdAt.toISOString().slice(0, 10);
    const row = byDay.get(key);
    if (!row) continue;
    row.bookings += 1;
    if (b.status === "COMPLETED") row.revenue += b.amountCents;
  }

  const completed30 = bookings30d.filter((b) => b.status === "COMPLETED").length;
  const growth = bookings60 === 0 ? 100 : Math.round(((bookings30 - bookings60) / bookings60) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Last 30 days</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Bookings" value={bookings30} trend={{ value: growth }} />
        <Stat label="Completed sessions" value={completed30} hint="Payments are not live yet" />
        <Stat label="Avg rating" value={mentor.averageRating.toFixed(2)} hint={`${mentor.totalReviews} reviews`} />
      </div>
      <Card>
        <CardHeader><CardTitle>Bookings over time</CardTitle></CardHeader>
        <CardContent><AnalyticsChart data={bins} /></CardContent>
      </Card>
    </div>
  );
}
