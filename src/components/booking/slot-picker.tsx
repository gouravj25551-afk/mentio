"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Sparkles } from "lucide-react";
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
    return <div className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" aria-hidden />;
  }

  const options = Array.from({ length: days }, (_, i) => addDays(today, i));
  const todays = byDay.get(format(day, "yyyy-MM-dd")) ?? [];
  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const next = slots[0];
  const scroll = (dir: 1 | -1) => strip.current?.scrollBy({ left: dir * 240, behavior: "smooth" });

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
        <CalendarDays className="mx-auto h-6 w-6 text-white/40" aria-hidden />
        <p className="mt-3 text-sm font-medium text-white">No open times right now</p>
        <p className="mt-1 text-xs text-muted-foreground">This mentor&apos;s calendar is full for the next two weeks. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {next ? (
        <button
          type="button"
          onClick={() => {
            setDay(startOfDay(new Date(next.startsAt)));
            onSelect(next);
          }}
          className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-left transition hover:border-emerald-300/40"
        >
          <span className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-emerald-300" aria-hidden />
            <span>
              <span className="block text-[11px] text-emerald-200/70">Next available</span>
              <span className="block text-sm font-medium text-white">{format(new Date(next.startsAt), "EEE, MMM d · p")}</span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-emerald-200/70 transition group-hover:translate-x-0.5" aria-hidden />
        </button>
      ) : null}

      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-white" id="slot-days-label">
            <CalendarDays className="h-4 w-4 text-violet-300" aria-hidden /> {format(day, "MMMM yyyy")}
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => scroll(-1)} aria-label="Earlier days" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:text-white"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
            <button type="button" onClick={() => scroll(1)} aria-label="Later days" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:text-white"><ChevronRight className="h-4 w-4" aria-hidden /></button>
          </div>
        </div>
        <div ref={strip} role="group" aria-labelledby="slot-days-label" className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  "relative isolate flex h-[4.5rem] w-14 shrink-0 snap-start flex-col items-center justify-center rounded-2xl border text-xs transition-colors",
                  active ? "border-transparent text-white" : count > 0 ? "border-white/10 text-white/75 hover:border-white/25" : "cursor-not-allowed border-dashed border-white/[0.06] text-white/25",
                )}
              >
                {active ? <motion.span layoutId="slot-day" className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-violet-500 to-indigo-600 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.8)]" transition={{ type: "spring", stiffness: 380, damping: 30 }} /> : null}
                <span className="opacity-70">{format(d, "EEE")}</span>
                <span className="text-base font-semibold">{format(d, "d")}</span>
                {count > 0 ? <span className={cn("mt-0.5 h-1 w-1 rounded-full", active ? "bg-white" : "bg-emerald-300")} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Clock className="h-4 w-4 text-cyan-300" aria-hidden /> {format(day, "EEEE")}
        </div>
        <AnimatePresence mode="wait">
          {todays.length === 0 ? (
            <motion.p key={`none-${day.toISOString()}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-sm text-muted-foreground">
              No times this day. Try another.
            </motion.p>
          ) : (
            <motion.div
              key={day.toISOString()}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
              className="mt-3 grid grid-cols-3 gap-2"
            >
              {todays.map((s) => {
                const isSel = selected === s.startsAt;
                return (
                  <motion.button
                    key={s.startsAt}
                    type="button"
                    variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={isSel}
                    onClick={() => onSelect(s)}
                    className={cn(
                      "rounded-xl border py-2.5 text-sm transition-colors",
                      isSel ? "border-violet-300/70 bg-violet-500/25 font-medium text-white shadow-[0_0_0_3px_rgba(139,92,246,0.18)]" : "border-white/10 bg-white/[0.02] text-white/80 hover:border-violet-300/40 hover:bg-white/[0.06]",
                    )}
                  >
                    {format(new Date(s.startsAt), "p")}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-3 text-[11px] text-muted-foreground">Times shown in your timezone ({viewerTz})</p>
      </div>
    </div>
  );
}
