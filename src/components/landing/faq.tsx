"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";

const items = [
  { q: "How much does a session cost?", a: "Each mentor sets their own price, and you always see it before you book. During early access, sessions are free." },
  { q: "How are mentors vetted?", a: "An admin reviews each mentor profile before it goes live. Ratings only come from students who completed a session." },
  { q: "What if a mentor cancels?", a: "You're notified by email and in your dashboard, and you can book another time or another mentor." },
  { q: "Can I reschedule?", a: "Yes, any time before the session starts, from your bookings page." },
  { q: "Can I become a mentor?", a: "Yes. Create a mentor account and complete your profile. It goes live once an admin approves it." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="container scroll-mt-24 py-24">
      <div className="mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-cyan-300/80">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">Questions, answered.</h2>
        </motion.div>
        <div className="mt-12 space-y-3">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={it.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className={"surface overflow-hidden rounded-2xl transition-colors " + (isOpen ? "border-violet-300/30" : "")}
              >
                <button
                  type="button"
                  className="flex min-h-14 w-full items-center justify-between gap-6 px-6 text-left"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="py-4 font-medium text-white">{it.q}</span>
                  <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.25 }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    <Plus className="h-4 w-4" aria-hidden />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      id={`faq-${i}`}
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                    >
                      <p className="px-6 pb-5 text-sm leading-6 text-muted-foreground">{it.a}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
