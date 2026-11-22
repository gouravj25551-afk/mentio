"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type ProfileTab = { id: string; label: string; content: React.ReactNode };

/** Tabs with a sliding indicator and a soft cross-fade between panels. */
export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const [active, setActive] = React.useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  const listRef = React.useRef<HTMLDivElement>(null);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = tabs.findIndex((t) => t.id === active);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    setActive(next.id);
    listRef.current?.querySelector<HTMLButtonElement>(`#tab-${next.id}`)?.focus();
  };

  return (
    <div>
      <div ref={listRef} role="tablist" aria-label="Mentor profile" onKeyDown={onKey} className="flex gap-1 border-b border-white/[0.08]">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={t.id === active}
            aria-controls={`panel-${t.id}`}
            tabIndex={t.id === active ? 0 : -1}
            onClick={() => setActive(t.id)}
            className={cn("relative px-4 pb-3 pt-2 text-sm font-medium transition-colors", t.id === active ? "text-white" : "text-white/50 hover:text-white/80")}
          >
            {t.label}
            {t.id === active ? (
              <motion.span layoutId="profile-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
            ) : null}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          id={`panel-${current.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${current.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="pt-8"
        >
          {current.content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
