"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatTime, initials } from "@/lib/utils";
import { toast } from "sonner";

export function BookingsTable({
  role,
  bookings,
  empty,
}: {
  role: "student" | "mentor" | "admin";
  bookings: any[];
  empty: React.ReactNode;
}) {
  const [cancel, setCancel] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  if (!bookings.length) {
    return <Card className="p-10 text-center">{empty}</Card>;
  }

  return (
    <Card className="divide-y">
      {bookings.map((b) => {
        const other = role === "student" ? b.mentorProfile.user : b.student;
        return (
          <div key={b.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={other?.image ?? undefined} />
                <AvatarFallback>{initials(other?.name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">{other?.name}</div>
                <div className="text-xs text-muted-foreground">{b.topic}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div>
                <div className="font-medium">{formatDate(b.startsAt)}</div>
                <div className="text-muted-foreground">{formatTime(b.startsAt)} — {formatTime(b.endsAt)}</div>
              </div>
              <StatusBadge status={b.status} />
            </div>
            <div className="flex items-center gap-2">
              {b.meetingUrl && b.status === "CONFIRMED" ? (
                <Button asChild variant="brand" size="sm"><a href={b.meetingUrl} target="_blank" rel="noreferrer">Join</a></Button>
              ) : null}
              {["PENDING", "CONFIRMED"].includes(b.status) ? (
                <Button variant="outline" size="sm" onClick={() => setCancel(b)}>Cancel</Button>
              ) : null}
              {role === "student" && b.status === "COMPLETED" && !b.review ? (
                <Button asChild variant="outline" size="sm"><Link href={`/dashboard/student/bookings/${b.id}`}>Leave review</Link></Button>
              ) : null}
              <Button asChild variant="ghost" size="sm"><Link href={`/dashboard/${role}/bookings/${b.id}`}>Details</Link></Button>
            </div>
          </div>
        );
      })}

      <Dialog open={!!cancel} onOpenChange={(o) => (o ? null : setCancel(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The other party will be notified. Reschedule from the booking details page instead if you want to keep this conversation.
          </p>
          <Textarea placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancel(null)}>Keep booking</Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await fetch(`/api/bookings/${cancel.id}/cancel`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ reason }),
                  });
                  if (!res.ok) {
                    const b = await res.json().catch(() => ({}));
                    toast.error(b?.error ?? "Could not cancel");
                    return;
                  }
                  toast.success("Booking cancelled");
                  setCancel(null);
                  setReason("");
                  window.location.reload();
                })
              }
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, any> = {
    CONFIRMED: "success",
    PENDING: "warning",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
    NO_SHOW: "destructive",
  };
  return <Badge variant={variant[status] ?? "secondary"}>{status}</Badge>;
}
