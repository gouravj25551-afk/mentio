"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { displayPrice } from "@/lib/pricing";

type Slot = { startsAt: string; endsAt: string };

export function BookingPanel({
  mentor,
  slots,
  authenticated,
}: {
  mentor: { id: string; name: string; sessionLength: number; rateCents: number; currency: string };
  slots: Slot[];
  authenticated: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<Date>(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i)), []);
  const slotsByDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = startOfDay(new Date(s.startsAt)).toISOString();
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    }
    return m;
  }, [slots]);

  const dayKey = startOfDay(day).toISOString();
  const slotsToday = slotsByDay.get(dayKey) ?? [];

  async function submit(formData: FormData) {
    if (!selected) return;
    setSubmitting(true);
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
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Something went wrong");
      toast.success("Booking confirmed");
      setOpen(false);
      router.push(`/dashboard/student/bookings/${body.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Could not book");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-baseline justify-between">
          <span>{displayPrice(mentor.rateCents, mentor.currency)}</span>
          <span className="text-sm font-normal text-muted-foreground">{mentor.sessionLength} min call</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" /> Pick a day
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const active = isSameDay(d, day);
              const key = startOfDay(d).toISOString();
              const has = (slotsByDay.get(key) ?? []).length > 0;
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={!has}
                  onClick={() => setDay(d)}
                  className={
                    "flex h-14 flex-col items-center justify-center rounded-md border text-xs transition " +
                    (active ? "border-foreground bg-foreground text-background" :
                     has ? "border-border bg-background hover:bg-muted" :
                     "border-dashed border-border/60 text-muted-foreground/50")
                  }
                >
                  <span className="opacity-70">{format(d, "EEE")}</span>
                  <span className="font-semibold">{format(d, "d")}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" /> Available times
          </div>
          {slotsToday.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No slots this day — try another.</p>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {slotsToday.map((s) => (
                <button
                  key={s.startsAt}
                  type="button"
                  onClick={() => { setSelected(s); setOpen(true); }}
                  className="rounded-md border bg-background py-2 text-sm hover:border-foreground hover:bg-muted"
                >
                  {format(new Date(s.startsAt), "p")}
                </button>
              ))}
            </div>
          )}
        </div>

        {!authenticated ? (
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <Link href="/sign-in" className="font-medium underline-offset-4 hover:underline">Sign in</Link> to book this mentor.
          </p>
        ) : null}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book {mentor.name}</DialogTitle>
            <DialogDescription>
              {selected ? (
                <>{format(new Date(selected.startsAt), "EEEE, MMMM d · p")} — {mentor.sessionLength} minutes</>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <form
            action={(fd) => submit(fd)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="topic">What do you want to talk about?</Label>
              <Input id="topic" name="topic" required placeholder="Resume review, career strategy, interview prep…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Context (optional)</Label>
              <Textarea id="notes" name="notes" placeholder="Share links or specific questions ahead of time." />
            </div>
            <DialogFooter>
              <Button type="submit" variant="brand" disabled={submitting || !authenticated}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm booking · {displayPrice(mentor.rateCents, mentor.currency)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
