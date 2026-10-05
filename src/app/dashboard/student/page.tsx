import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/dashboard/stat";
import { formatDate, formatTime } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { Calendar, Bookmark, Clock } from "lucide-react";
import { Empty } from "@/components/ui/empty";
import { BookingStatus } from "@prisma/client";

export default async function StudentOverview() {
  const user = await requireRole("STUDENT");
  const now = new Date();
  const [upcoming, past, saved] = await Promise.all([
    db.booking.findMany({
      where: { studentId: user.id, startsAt: { gte: now }, status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] } },
      include: { mentorProfile: { include: { user: true } } },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    db.booking.count({ where: { studentId: user.id, status: BookingStatus.COMPLETED } }),
    db.savedMentor.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-muted-foreground">Your upcoming conversations and saved mentors.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Upcoming" value={upcoming.length} icon={<Calendar className="h-4 w-4 text-indigo-500" />} />
        <Stat label="Completed" value={past} icon={<Clock className="h-4 w-4 text-indigo-500" />} />
        <Stat label="Saved mentors" value={saved} icon={<Bookmark className="h-4 w-4 text-indigo-500" />} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Upcoming calls</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link href="/dashboard/student/bookings">View all</Link></Button>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <Empty
              title="No calls on the calendar yet"
              description="Browse mentors and book your first conversation."
              action={<Button asChild variant="brand"><Link href="/mentors">Find a mentor</Link></Button>}
            />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={b.mentorProfile.user.image ?? undefined} />
                      <AvatarFallback>{initials(b.mentorProfile.user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{b.mentorProfile.user.name}</div>
                      <div className="text-xs text-muted-foreground">{b.topic}</div>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-medium">{formatDate(b.startsAt)}</div>
                    <div className="text-muted-foreground">{formatTime(b.startsAt)}</div>
                  </div>
                  <Button asChild variant="outline" size="sm"><Link href={`/dashboard/student/bookings/${b.id}`}>Details</Link></Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
