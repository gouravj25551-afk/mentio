"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { CalendarCheck2 } from "lucide-react";

/** Phones only: a floating bar that scrolls to the booking panel. */
export function MobileBookBar({ name, nextSlot }: { name: string; nextSlot: string | null }) {
  // Times are formatted in the viewer's timezone, which only exists in the browser.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 26 }}
      className="fixed inset-x-3 bottom-3 z-40 lg:hidden"
    >
      <a href="#book" className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-black/90 p-2.5 pl-4 backdrop-blur-xl">
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium">Book a call with {name.split(" ")[0]}</span>
          <span className="block text-[11px] text-white/50">{nextSlot && mounted ? `Next: ${format(new Date(nextSlot), "EEE d · p")}` : "See availability"}</span>
        </span>
        <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-white px-3.5 text-[13px] font-medium text-black">
          <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden /> Book
        </span>
      </a>
    </motion.div>
  );
}
