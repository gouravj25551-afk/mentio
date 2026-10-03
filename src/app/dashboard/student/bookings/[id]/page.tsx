import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials, formatDate, formatTime } from "@/lib/utils";
import { ReviewForm } from "@/components/dashboard/review-form";

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const booking = await db.booking.findUnique({
    where: { id },
    include: { mentorProfile: { include: { user: true } }, student: true, review: true },
  });
  if (!booking) notFound();
  if (booking.studentId !== user.id && booking.mentorProfile.userId !== user.id && user.role !== "ADMIN") notFound();

  const other = booking.studentId === user.id ? booking.mentorProfile.user : booking.student;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/dashboard/student/bookings" className="text-sm text-muted-foreground hover:text-foreground">← Back to bookings</Link>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Booking details</span>
            <Badge variant={booking.status === "CONFIRMED" ? "success" : booking.status === "CANCELLED" ? "destructive" : "secondary"}>{booking.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={other.image ?? undefined} />
              <AvatarFallback>{initials(other.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{other.name}</div>
              <div className="text-sm text-muted-foreground">{booking.topic}</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date">{formatDate(booking.startsAt)}</Field>
            <Field label="Time">{formatTime(booking.startsAt)} — {formatTime(booking.endsAt)}</Field>
          </div>
          {booking.notes ? <Field label="Context">{booking.notes}</Field> : null}
          {booking.meetingUrl && booking.status === "CONFIRMED" ? (
            <div className="flex items-center justify-between rounded-md bg-muted p-3">
              <div className="text-sm">Meeting link</div>
              <Button asChild variant="brand" size="sm"><a href={booking.meetingUrl} target="_blank" rel="noreferrer">Join</a></Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {booking.studentId === user.id && booking.status === "COMPLETED" ? (
        <Card>
          <CardHeader><CardTitle>How was it?</CardTitle></CardHeader>
          <CardContent>
            <ReviewForm bookingId={booking.id} initialRating={booking.review?.rating} initialComment={booking.review?.comment ?? ""} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
