import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsTable } from "@/components/dashboard/bookings-table";

export const metadata = { title: "Bookings" };

export default async function StudentBookings() {
  const user = await requireRole("STUDENT");
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    db.booking.findMany({
      where: { studentId: user.id, startsAt: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
      include: { mentorProfile: { include: { user: true } } },
      orderBy: { startsAt: "asc" },
    }),
    db.booking.findMany({
      where: { studentId: user.id, OR: [{ startsAt: { lt: now } }, { status: { in: ["CANCELLED", "COMPLETED", "NO_SHOW"] } }] },
      include: { mentorProfile: { include: { user: true } }, review: true },
      orderBy: { startsAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Your bookings</h1>
        <p className="text-sm text-muted-foreground">Upcoming, past, and the links to your meetings.</p>
      </div>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <BookingsTable role="student" bookings={upcoming} empty={<p className="text-sm text-muted-foreground">No upcoming calls. <Link href="/mentors" className="font-medium underline-offset-4 hover:underline">Browse mentors →</Link></p>} />
        </TabsContent>
        <TabsContent value="past">
          <BookingsTable role="student" bookings={past} empty={<p className="text-sm text-muted-foreground">Nothing in your history yet.</p>} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
