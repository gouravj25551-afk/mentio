"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SlotPicker, type Slot } from "@/components/booking/slot-picker";

export function BookingPanel({
  mentor,
  slots,
  viewer,
  blockedReason,
}: {
  mentor: { id: string; slug: string; name: string; sessionLength: number; timezone: string };
  slots: Slot[];
  /** null when signed out. */
  viewer: { role: "STUDENT" | "MENTOR" | "ADMIN" } | null;
  /** Set by the server when this mentor can't be booked at all (not accepting, paid, not public...). */
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canBook = viewer?.role === "STUDENT" && !blockedReason;

  function pick(slot: Slot) {
    if (!viewer) {
      router.push(`/sign-in?next=${encodeURIComponent(`/mentors/${mentor.slug}`)}`);
      return;
    }
    setSelected(slot);
    setError(null);
    setOpen(true);
  }

  async function submit(formData: FormData) {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mentorProfileId: mentor.id,
          startsAt: selected.startsAt,
          topic: String(formData.get("topic") ?? ""),
          notes: String(formData.get("notes") ?? ""),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Something went wrong. Please try again.");
        // The slot may have just been taken: reload the list so it disappears.
        if (res.status === 409) router.refresh();
        return;
      }
      toast.success("Booking confirmed");
      setOpen(false);
      router.push(`/dashboard/student/bookings/${body.id}`);
    } catch {
      setError("Network problem. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-baseline justify-between">
          <span>Free</span>
          <span className="text-sm font-normal text-muted-foreground">{mentor.sessionLength} min call</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        {blockedReason ? (
          <p role="status" className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{blockedReason}</p>
        ) : (
          <>
            <SlotPicker slots={slots} selected={selected?.startsAt} onSelect={pick} />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5" aria-hidden /> Mentor is in {mentor.timezone}
            </p>
          </>
        )}
        {!viewer && !blockedReason ? (
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <Link href={`/sign-in?next=${encodeURIComponent(`/mentors/${mentor.slug}`)}`} className="font-medium underline-offset-4 hover:underline">Sign in</Link> to book this mentor.
          </p>
        ) : null}
        {viewer && viewer.role !== "STUDENT" && !blockedReason ? (
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Only student accounts can book sessions.</p>
        ) : null}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book {mentor.name}</DialogTitle>
            <DialogDescription>
              {selected ? `${format(new Date(selected.startsAt), "EEEE, MMMM d · p")} (your time) — ${mentor.sessionLength} minutes` : null}
            </DialogDescription>
          </DialogHeader>
          <form action={(fd) => submit(fd)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">What do you want to talk about?</Label>
              <Input id="topic" name="topic" required minLength={2} maxLength={140} placeholder="Resume review, career strategy, interview prep…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Context (optional)</Label>
              <Textarea id="notes" name="notes" maxLength={2000} placeholder="Share links or specific questions ahead of time." />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" variant="brand" disabled={submitting || !canBook}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm booking
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
