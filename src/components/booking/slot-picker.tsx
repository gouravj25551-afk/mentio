"use client";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";

import { cn } from "@/lib/utils";

export type Slot = { startsAt: string; endsAt: string };

/**
 * Day + time picker. Slot instants come from the server; this only decides how
 * to display them, in the viewer's own timezone (shown explicitly in the label).
 */
export function SlotPicker({
  slots,
  selected,
  onSelect,
  days = 14,
}: {
  slots: Slot[];
  selected?: string | null;
  onSelect: (slot: Slot) => void;
  days?: number;
}) {
  // "Today" depends on the viewer's clock, so it is only read after mount to keep server and client markup identical.
  const [today, setToday] = useState<Date | null>(null);
  const [day, setDay] = useState<Date | null>(null);
  useEffect(() => {
    const t = startOfDay(new Date());
    setToday(t);
    setDay(t);
  }, []);

  const byDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = format(new Date(s.startsAt), "yyyy-MM-dd");
      m.set(key, [...(m.get(key) ?? []), s]);
    }
    return m;
  }, [slots]);

  if (!today || !day) {
    return <div className="h-40 animate-pulse rounded-md bg-muted" aria-hidden />;
  }

  const options = Array.from({ length: days }, (_, i) => addDays(today, i));
  const firstWithSlots = options.find((d) => byDay.has(format(d, "yyyy-MM-dd")));
  const todays = byDay.get(format(day, "yyyy-MM-dd")) ?? [];
  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-5">
      {slots.length === 0 ? (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">No open times in the next few weeks. Check back soon.</p>
      ) : null}

      <div>
        <div className="flex items-center gap-2 text-sm font-medium" id="slot-days-label">
          <Calendar className="h-4 w-4" aria-hidden /> Pick a day
        </div>
        <div role="group" aria-labelledby="slot-days-label" className="mt-3 grid grid-cols-7 gap-1.5">
          {options.map((d) => {
            const count = byDay.get(format(d, "yyyy-MM-dd"))?.length ?? 0;
            const active = isSameDay(d, day);
            return (
              <button
                key={d.toISOString()}
                type="button"
                disabled={count === 0}
                aria-pressed={active}
                aria-label={`${format(d, "EEEE, MMMM d")}, ${count ? `${count} times available` : "no times available"}`}
                onClick={() => setDay(d)}
                className={cn(
                  "flex h-14 flex-col items-center justify-center rounded-md border text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active && "border-foreground bg-foreground text-background",
                  !active && count > 0 && "border-border bg-background hover:bg-muted",
                  count === 0 && "cursor-not-allowed border-dashed border-border/60 text-muted-foreground/50",
                )}
              >
                <span className="opacity-70">{format(d, "EEE")}</span>
                <span className="font-semibold">{format(d, "d")}</span>
              </button>
            );
          })}
        </div>
        {todays.length === 0 && firstWithSlots ? (
          <button type="button" onClick={() => setDay(firstWithSlots)} className="mt-2 inline-flex min-h-11 items-center text-xs text-muted-foreground underline underline-offset-4">
            Jump to next available day
          </button>
        ) : null}
      </div>

      <div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4" aria-hidden /> Available times
        </div>
        {todays.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No times this day. Try another.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {todays.map((s) => (
              <button
                key={s.startsAt}
                type="button"
                aria-pressed={selected === s.startsAt}
                onClick={() => onSelect(s)}
                className={cn(
                  "rounded-md border py-2 text-sm transition hover:border-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  selected === s.startsAt ? "border-foreground bg-muted font-medium" : "bg-background",
                )}
              >
                {format(new Date(s.startsAt), "p")}
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Times shown in {viewerTz}</p>
      </div>
    </div>
  );
}
