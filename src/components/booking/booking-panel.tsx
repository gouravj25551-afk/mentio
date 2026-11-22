"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, ShieldCheck, Video } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SlotPicker, type Slot } from "@/components/booking/slot-picker";

/**
 * Students always book on Mentio: pick a day, pick a time, add a topic, confirm.
 * Times hidden by a mentor's connected Cal.com / Calendly calendar never reach
 * this list, and the server re-checks every booking.
 */
export function BookingPanel({
  mentor,
  slots,
  viewer,
  blockedReason,
  priceLabel,
}: {
  mentor: { id: string; slug: string; name: string; sessionLength: number; timezone: string };
  slots: Slot[];
  /** null when signed out. */
  viewer: { role: "STUDENT" | "MENTOR" | "ADMIN" } | null;
  /** Set by the server when this mentor can't be booked at all (not accepting, paid, not public...). */
  blockedReason: string | null;
  priceLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canBook = viewer?.role === "STUDENT" && !blockedReason;
  const signInHref = `/sign-in?next=${encodeURIComponent(`/mentors/${mentor.slug}`)}`;

  function proceed() {
    if (!selected) return;
    if (!viewer) {
      router.push(signInHref);
      return;
    }
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
    <div id="book" className="ring-animated scroll-mt-24 rounded-3xl">
      <div className="surface rounded-3xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Book a call</p>
            <p className="mt-1 font-display text-2xl font-semibold text-white">{priceLabel}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/75">
            <Video className="h-3.5 w-3.5 text-cyan-300" aria-hidden /> {mentor.sessionLength} min
          </span>
        </div>

        <div className="space-y-5 p-6">
          {blockedReason ? (
            <p role="status" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">{blockedReason}</p>
          ) : (
            <SlotPicker slots={slots} selected={selected?.startsAt} onSelect={setSelected} />
          )}

          {!blockedReason && viewer && viewer.role !== "STUDENT" ? (
            <p className="rounded-2xl bg-white/[0.03] p-3 text-xs text-muted-foreground">Only student accounts can book sessions.</p>
          ) : null}

          {!blockedReason && slots.length > 0 ? (
            <AnimatePresence mode="wait" initial={false}>
              {selected ? (
                <motion.div key="go" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                  <Button
                    type="button"
                    variant="brand"
                    size="lg"
                    className="shine w-full rounded-2xl"
                    onClick={proceed}
                    disabled={Boolean(viewer) && !canBook}
                  >
                    {viewer ? `Book ${format(new Date(selected.startsAt), "EEE d · p")}` : "Sign in to book"}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </motion.div>
              ) : (
                <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-xs text-muted-foreground">
                  Pick a time to continue.{" "}
                  {!viewer ? <><Link href={signInHref} className="font-medium text-white underline-offset-4 hover:underline">Sign in</Link> to book.</> : null}
                </motion.p>
              )}
            </AnimatePresence>
          ) : null}

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/40">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Instant confirmation · free to reschedule before the call
          </p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book {mentor.name}</DialogTitle>
            <DialogDescription>
              {selected ? `${format(new Date(selected.startsAt), "EEEE, MMMM d · p")} (your time) · ${mentor.sessionLength} minutes` : null}
            </DialogDescription>
          </DialogHeader>
          <form action={(fd) => submit(fd)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">What do you want to talk about?</Label>
              <Input id="topic" name="topic" required minLength={2} maxLength={140} placeholder="GSoC proposal review, interview prep, career advice…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Context (optional)</Label>
              <Textarea id="notes" name="notes" maxLength={2000} placeholder="Share links or specific questions ahead of time." />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" variant="brand" disabled={submitting || !canBook}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Confirm booking
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
