"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";

import { cn } from "@/lib/utils";

export type Slot = { startsAt: string; endsAt: string };

/**
 * Day strip + time grid. Slot instants come from the server; this only decides
 * how to display them, in the viewer's own timezone (shown explicitly below).
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
  const strip = useRef<HTMLDivElement>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = format(new Date(s.startsAt), "yyyy-MM-dd");
      m.set(key, [...(m.get(key) ?? []), s]);
    }
    return m;
  }, [slots]);

  useEffect(() => {
    const t = startOfDay(new Date());
    setToday(t);
    // Open on the first day that actually has times.
    const first = slots[0] ? startOfDay(new Date(slots[0].startsAt)) : t;
    setDay(first);
  }, [slots]);

  if (!today || !day) {
    return <div className="h-52 animate-pulse rounded-md bg-white/[0.04]" aria-hidden />;
  }

  const options = Array.from({ length: days }, (_, i) => addDays(today, i));
  const todays = byDay.get(format(day, "yyyy-MM-dd")) ?? [];
  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const next = slots[0];
  const scroll = (dir: 1 | -1) => strip.current?.scrollBy({ left: dir * 240, behavior: "smooth" });

  if (slots.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-white/15 p-5 text-center">
        <CalendarDays className="mx-auto h-5 w-5 text-white/40" aria-hidden />
        <p className="mt-2.5 text-[13px] font-medium">No open times right now</p>
        <p className="mt-1 text-xs text-muted-foreground">This mentor&apos;s calendar is full for the next two weeks. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {next ? (
        <button
          type="button"
          onClick={() => {
            setDay(startOfDay(new Date(next.startsAt)));
            onSelect(next);
          }}
          className="group flex w-full items-center justify-between gap-3 rounded-md border border-white/12 px-3 py-2 text-left transition-colors hover:border-white/40 hover:bg-white/[0.04]"
        >
          <span>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Next available</span>
            <span className="block text-[13px] font-medium">{format(new Date(next.startsAt), "EEE, MMM d · p")}</span>
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-white/50 transition-transform group-hover:translate-x-0.5 group-hover:text-white" aria-hidden />
        </button>
      ) : null}

      <div>
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-medium" id="slot-days-label">{format(day, "MMMM yyyy")}</div>
          <div className="flex gap-1">
            <button type="button" onClick={() => scroll(-1)} aria-label="Earlier days" className="flex h-7 w-7 items-center justify-center rounded-md border border-white/12 text-white/60 transition-colors hover:border-white/40 hover:text-white"><ChevronLeft className="h-3.5 w-3.5" aria-hidden /></button>
            <button type="button" onClick={() => scroll(1)} aria-label="Later days" className="flex h-7 w-7 items-center justify-center rounded-md border border-white/12 text-white/60 transition-colors hover:border-white/40 hover:text-white"><ChevronRight className="h-3.5 w-3.5" aria-hidden /></button>
          </div>
        </div>
        <div ref={strip} role="group" aria-labelledby="slot-days-label" className="-mx-1 mt-2.5 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  "relative isolate flex h-14 w-12 shrink-0 snap-start flex-col items-center justify-center rounded-md border text-[11px] transition-colors",
                  active ? "border-transparent text-black" : count > 0 ? "border-white/12 text-white/75 hover:border-white/40" : "cursor-not-allowed border-dashed border-white/[0.07] text-white/25",
                )}
              >
                {active ? <motion.span layoutId="slot-day" className="absolute inset-0 -z-10 rounded-md bg-white" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                <span className="opacity-70">{format(d, "EEE")}</span>
                <span className="text-sm font-semibold">{format(d, "d")}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{format(day, "EEEE")}</div>
        <AnimatePresence mode="wait">
          {todays.length === 0 ? (
            <motion.p key={`none-${day.toISOString()}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2.5 text-[13px] text-muted-foreground">
              No times this day. Try another.
            </motion.p>
          ) : (
            <motion.div
              key={day.toISOString()}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
              className="mt-2.5 grid grid-cols-3 gap-1.5"
            >
              {todays.map((s) => {
                const isSel = selected === s.startsAt;
                return (
                  <motion.button
                    key={s.startsAt}
                    type="button"
                    variants={{ hidden: { opacity: 0, y: 5 }, show: { opacity: 1, y: 0 } }}
                    whileTap={{ scale: 0.96 }}
                    aria-pressed={isSel}
                    onClick={() => onSelect(s)}
                    className={cn(
                      "h-8 rounded-md border text-xs transition-colors",
                      isSel ? "border-white bg-white font-medium text-black" : "border-white/12 text-white/80 hover:border-white/40 hover:bg-white/[0.05]",
                    )}
                  >
                    {format(new Date(s.startsAt), "p")}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-2.5 text-[11px] text-muted-foreground">Times shown in your timezone ({viewerTz})</p>
      </div>
    </div>
  );
}
