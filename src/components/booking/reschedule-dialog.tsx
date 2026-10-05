"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SlotPicker, type Slot } from "@/components/booking/slot-picker";

export function RescheduleDialog({
  bookingId,
  mentorSlug,
  open,
  onOpenChange,
}: {
  bookingId: string;
  mentorSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSlots(null);
    setSelected(null);
    setLoadError(null);
    setError(null);
    fetch(`/api/mentors/${encodeURIComponent(mentorSlug)}/slots`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? "Could not load times");
        if (!cancelled) setSlots(body.slots as Slot[]);
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [open, mentorSlug]);

  async function confirm() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startsAt: selected.startsAt }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not reschedule");
        if (res.status === 409) router.refresh();
        return;
      }
      toast.success("Booking rescheduled");
      onOpenChange(false);
      // The old booking is replaced by a new one, so go to the new booking.
      router.push(`/dashboard/student/bookings/${body.id}`);
      router.refresh();
    } catch {
      setError("Network problem. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pick a new time</DialogTitle>
          <DialogDescription>
            {selected ? `New time: ${format(new Date(selected.startsAt), "EEEE, MMMM d · p")}` : "Your current time is kept until you confirm."}
          </DialogDescription>
        </DialogHeader>
        {loadError ? (
          <p role="alert" className="text-sm text-destructive">{loadError}</p>
        ) : slots === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading times…</div>
        ) : (
          <SlotPicker slots={slots} selected={selected?.startsAt} onSelect={setSelected} />
        )}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Keep current time</Button>
          <Button variant="brand" disabled={!selected || submitting} onClick={confirm}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm new time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
