"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RescheduleDialog } from "@/components/booking/reschedule-dialog";
import type { BookingRowData } from "@/features/bookings/rows";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Something went wrong. Please try again.");
  return data;
}

/** Cancel / reschedule / mark-finished controls. Which ones show is decided on the server (`booking.can`). */
export function BookingActions({ booking }: { booking: Pick<BookingRowData, "id" | "mentorSlug" | "can"> }) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"cancel" | "complete" | null>(null);

  async function cancel() {
    setBusy("cancel");
    try {
      await post(`/api/bookings/${booking.id}/cancel`, { reason });
      toast.success("Booking cancelled");
      setCancelOpen(false);
      setReason("");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function complete(outcome: "COMPLETED" | "NO_SHOW") {
    setBusy("complete");
    try {
      await post(`/api/bookings/${booking.id}/complete`, { outcome });
      toast.success(outcome === "COMPLETED" ? "Marked as completed" : "Marked as no-show");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {booking.can.complete ? (
        <>
          <Button variant="brand" size="sm" disabled={busy !== null} onClick={() => complete("COMPLETED")}>
            {busy === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Mark completed
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => complete("NO_SHOW")}>No-show</Button>
        </>
      ) : null}
      {booking.can.reschedule ? (
        <Button variant="outline" size="sm" onClick={() => setRescheduleOpen(true)}>Reschedule</Button>
      ) : null}
      {booking.can.cancel ? (
        <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>Cancel</Button>
      ) : null}

      {booking.can.reschedule ? (
        <RescheduleDialog bookingId={booking.id} mentorSlug={booking.mentorSlug} open={rescheduleOpen} onOpenChange={setRescheduleOpen} />
      ) : null}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>The other person will be notified and the time is released. To keep the conversation, reschedule instead.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`reason-${booking.id}`}>Reason (optional)</Label>
            <Textarea id={`reason-${booking.id}`} value={reason} maxLength={400} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep booking</Button>
            <Button variant="destructive" disabled={busy !== null} onClick={cancel}>
              {busy === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
