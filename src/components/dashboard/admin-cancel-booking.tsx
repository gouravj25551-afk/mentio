"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// An explicit, per-booking admin decision. Nothing is cancelled automatically.
export function AdminCancelBooking({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();
  const cancel = () =>
    startTransition(async () => {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by an administrator because the mentor is unavailable." }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        toast.error(b?.error ?? "Couldn't cancel this booking.");
        return;
      }
      toast.success("Booking cancelled. Both people were notified.");
      window.location.reload();
    });
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={cancel}>
      {pending ? "Cancelling…" : "Cancel booking"}
    </Button>
  );
}
