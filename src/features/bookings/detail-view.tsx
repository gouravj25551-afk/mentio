import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingActions } from "@/components/dashboard/booking-actions";
import { ReviewForm } from "@/components/dashboard/review-form";
import { bookingRowSelect, toBookingRow } from "@/features/bookings/rows";
import type { CurrentUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatDayInZone, formatTimeInZone } from "@/lib/time";
import { initials } from "@/lib/utils";
import { meetingKindLabel } from "@/services/calendar";

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> = {
  CONFIRMED: { label: "Confirmed", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "secondary" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  NO_SHOW: { label: "No-show", variant: "destructive" },
};

/** One booking, as seen by a participant (or an admin). Anyone else gets a 404. */
export async function BookingDetailView({ viewer, bookingId, area }: { viewer: CurrentUser; bookingId: string; area: "student" | "mentor" }) {
  const found = await db.booking.findUnique({ where: { id: bookingId }, select: bookingRowSelect });
  const participant = found && (found.studentId === viewer.id || found.mentorProfile.userId === viewer.id);
  if (!found || (!participant && viewer.role !== "ADMIN")) notFound();

  const booking = toBookingRow(found, viewer);
  const isStudent = found.studentId === viewer.id;
  const comment = isStudent
    ? (await db.review.findUnique({ where: { bookingId }, select: { comment: true } }))?.comment ?? ""
    : "";
  const status = STATUS[booking.status];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/dashboard/${area}/bookings`} className="text-sm text-muted-foreground hover:text-foreground">← Back to bookings</Link>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Booking details</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={booking.counterpart.image ?? undefined} alt="" />
              <AvatarFallback>{initials(booking.counterpart.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{booking.counterpart.name}</div>
              <div className="text-sm text-muted-foreground">{booking.topic}</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date">{formatDayInZone(booking.startsAt, viewer.timezone)}</Field>
            <Field label="Time">
              {formatTimeInZone(booking.startsAt, viewer.timezone)} – {formatTimeInZone(booking.endsAt, viewer.timezone, true)}
            </Field>
          </div>
          {booking.notes ? <Field label="Context">{booking.notes}</Field> : null}
          {booking.cancelReason && booking.status === "CANCELLED" ? <Field label="Cancellation">{booking.cancelReason}</Field> : null}

          {booking.can.join && booking.meetingUrl ? (
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
              <div>
                <div className="text-sm font-medium">Meeting link</div>
                <div className="text-xs text-muted-foreground">{meetingKindLabel[booking.meetingKind]}</div>
              </div>
              <Button asChild variant="brand" size="sm">
                <a href={booking.meetingUrl} target="_blank" rel="noreferrer noopener">Join</a>
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <BookingActions booking={booking} />
          </div>
        </CardContent>
      </Card>

      {booking.can.review ? (
        <Card>
          <CardHeader><CardTitle>How was it?</CardTitle></CardHeader>
          <CardContent>
            <ReviewForm bookingId={booking.id} initialRating={booking.rating ?? undefined} initialComment={comment} />
          </CardContent>
        </Card>
      ) : null}

      {!isStudent && booking.rating !== null ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-5 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden /> The student rated this session {booking.rating} out of 5.
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
