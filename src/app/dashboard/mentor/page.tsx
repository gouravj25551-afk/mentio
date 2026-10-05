import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/dashboard/stat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, formatTime, initials } from "@/lib/utils";
import { Calendar, Star, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function MentorOverview() {
  const user = await requireRole(["MENTOR", "ADMIN"]);
  const mentor = await db.mentorProfile.findUnique({ where: { userId: user.id } });
  if (!mentor) {
    return (
      <Card className="p-10 text-center">
        <h2 className="font-display text-xl font-semibold">Finish setting up your mentor profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your application starts the approval process.</p>
        <Button asChild variant="brand" className="mt-4"><Link href="/onboarding/mentor">Start onboarding</Link></Button>
      </Card>
    );
  }
  const now = new Date();
  const [upcoming, completed30d, completedTotal, latestReviews] = await Promise.all([
    db.booking.findMany({
      where: { mentorProfileId: mentor.id, startsAt: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
      include: { student: true },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    db.booking.count({
      where: { mentorProfileId: mentor.id, status: "COMPLETED", startsAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
    }),
    db.booking.count({ where: { mentorProfileId: mentor.id, status: "COMPLETED" } }),
    db.review.findMany({ where: { mentorProfileId: mentor.id }, include: { author: true }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Mentor overview</h1>
          <p className="text-sm text-muted-foreground">Your mentorship at a glance.</p>
        </div>
        <Badge variant={mentor.status === "APPROVED" ? "success" : "warning"}>Status: {mentor.status}</Badge>
      </div>

      {mentor.status !== "APPROVED" ? (
        <Card className="p-5 text-sm">
          {mentor.status === "PENDING"
            ? "Your application is under review. You'll get an email when it's approved. Until then your profile is not public and you can't take bookings."
            : mentor.status === "REJECTED"
            ? "Your application wasn't approved. You can update it from your profile and we'll take another look."
            : "Your mentor account is suspended."}
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Upcoming calls" value={upcoming.length} icon={<Calendar className="h-4 w-4 text-indigo-500" />} />
        <Stat label="Last 30 days" value={completed30d} hint="completed sessions" icon={<Users className="h-4 w-4 text-indigo-500" />} />
        <Stat label="Avg rating" value={mentor.averageRating.toFixed(1)} hint={`${mentor.totalReviews} reviews`} icon={<Star className="h-4 w-4 text-indigo-500" />} />
        <Stat label="Completed (lifetime)" value={completedTotal} hint="Payments are not live yet" icon={<Wallet className="h-4 w-4 text-indigo-500" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Next sessions</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/mentor/bookings">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing booked yet. Share your profile — <Link href={`/mentors/${mentor.slug}`} className="font-medium underline-offset-4 hover:underline">/mentors/{mentor.slug}</Link></p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarImage src={b.student.image ?? undefined} /><AvatarFallback>{initials(b.student.name)}</AvatarFallback></Avatar>
                      <div>
                        <div className="text-sm font-medium">{b.student.name}</div>
                        <div className="text-xs text-muted-foreground">{b.topic}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-medium">{formatDate(b.startsAt)}</div>
                      <div className="text-muted-foreground">{formatTime(b.startsAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Latest reviews</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/mentor/reviews">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {latestReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <ul className="space-y-4">
                {latestReviews.map((r) => (
                  <li key={r.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7"><AvatarFallback>{initials(r.author.name)}</AvatarFallback></Avatar>
                      <div className="font-medium">{r.author.name ?? "Student"}</div>
                      <div className="ml-auto flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                      </div>
                    </div>
                    {r.comment ? <p className="mt-2 text-muted-foreground">{r.comment}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
