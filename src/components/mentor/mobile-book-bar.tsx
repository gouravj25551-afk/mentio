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
      <a href="#book" className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b0e22]/90 p-3 pl-4 shadow-2xl backdrop-blur-xl">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">Book a call with {name.split(" ")[0]}</span>
          <span className="block text-xs text-white/50">{nextSlot && mounted ? `Next: ${format(new Date(nextSlot), "EEE d · p")}` : "See availability"}</span>
        </span>
        <span className="brand-gradient inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
          <CalendarCheck2 className="h-4 w-4" aria-hidden /> Book
        </span>
      </a>
    </motion.div>
  );
}
