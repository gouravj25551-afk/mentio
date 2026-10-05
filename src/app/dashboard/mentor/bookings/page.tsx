import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsTable } from "@/components/dashboard/bookings-table";
import { bookingRowSelect, toBookingRow } from "@/features/bookings/rows";

export default async function MentorBookings() {
  const user = await requireRole("MENTOR");
  const mentor = await db.mentorProfile.findUnique({ where: { userId: user.id } });
  if (!mentor) return <p className="text-sm text-muted-foreground">You don&apos;t have a mentor profile yet.</p>;
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    db.booking.findMany({
      where: { mentorProfileId: mentor.id, startsAt: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
      select: bookingRowSelect,
      orderBy: { startsAt: "asc" },
    }),
    db.booking.findMany({
      where: { mentorProfileId: mentor.id, OR: [{ startsAt: { lt: now } }, { status: { in: ["CANCELLED", "COMPLETED", "NO_SHOW"] } }] },
      select: bookingRowSelect,
      orderBy: { startsAt: "desc" },
      take: 50,
    }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Your bookings</h1>
        <p className="text-sm text-muted-foreground">Everything on your calendar through Mentio.</p>
      </div>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming"><BookingsTable role="mentor" timezone={user.timezone} bookings={upcoming.map((b) => toBookingRow(b, user, now))} empty={<p className="text-sm text-muted-foreground">No upcoming calls.</p>} /></TabsContent>
        <TabsContent value="past"><BookingsTable role="mentor" timezone={user.timezone} bookings={past.map((b) => toBookingRow(b, user, now))} empty={<p className="text-sm text-muted-foreground">Nothing in your history yet.</p>} /></TabsContent>
      </Tabs>
    </div>
  );
}
