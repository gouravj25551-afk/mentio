import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookingActions } from "@/components/dashboard/booking-actions";
import type { BookingRowData } from "@/features/bookings/rows";
import { formatDayInZone, formatTimeInZone } from "@/lib/time";
import { initials } from "@/lib/utils";

export function BookingsTable({
  role,
  bookings,
  timezone,
  empty,
}: {
  role: "student" | "mentor";
  bookings: BookingRowData[];
  /** The viewer's timezone: times are always shown in it, with its abbreviation. */
  timezone: string;
  empty: React.ReactNode;
}) {
  if (!bookings.length) {
    return <Card className="p-10 text-center">{empty}</Card>;
  }

  return (
    <Card className="divide-y">
      {bookings.map((b) => (
        <div key={b.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={b.counterpart.image ?? undefined} alt="" />
              <AvatarFallback>{initials(b.counterpart.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{b.counterpart.name}</div>
              <div className="truncate text-xs text-muted-foreground">{b.topic}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <div className="font-medium">{formatDayInZone(b.startsAt, timezone)}</div>
              <div className="text-muted-foreground">
                {formatTimeInZone(b.startsAt, timezone)} – {formatTimeInZone(b.endsAt, timezone, true)}
              </div>
            </div>
            <StatusBadge status={b.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {b.can.join && b.meetingUrl ? (
              <Button asChild variant="brand" size="sm">
                <a href={b.meetingUrl} target="_blank" rel="noreferrer noopener">Join</a>
              </Button>
            ) : null}
            <BookingActions booking={b} />
            {b.can.review && b.rating === null ? (
              <Button asChild variant="outline" size="sm"><Link href={`/dashboard/${role}/bookings/${b.id}`}>Leave review</Link></Button>
            ) : null}
            <Button asChild variant="ghost" size="sm"><Link href={`/dashboard/${role}/bookings/${b.id}`}>Details</Link></Button>
          </div>
        </div>
      ))}
    </Card>
  );
}

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
    CONFIRMED: "success",
    PENDING: "warning",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
    NO_SHOW: "destructive",
  };
  return <Badge variant={variant[status] ?? "secondary"}>{STATUS_LABEL[status] ?? status}</Badge>;
}
