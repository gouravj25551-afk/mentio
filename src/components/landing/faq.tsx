"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";

import { paymentsEnabled } from "@/lib/pricing";
import { Eyebrow, FadeIn } from "@/components/motion/primitives";

const items = [
  { q: "How much does a session cost?", a: paymentsEnabled() ? "Each mentor sets their own price and you always see it before you book. You pay securely at checkout with UPI, card or netbanking." : "Each mentor sets their own price, and you always see it before you book. During early access, sessions are free." },
  { q: "How are mentors vetted?", a: "An admin reviews each mentor profile before it goes live. Ratings only come from students who completed a session." },
  { q: "What if a mentor cancels?", a: paymentsEnabled() ? "You're notified and refunded, and you can book another time or another mentor." : "You're notified by email and in your dashboard, and you can book another time or another mentor." },
  { q: "Can I reschedule?", a: "Yes, any time before the session starts, from your bookings page." },
  { q: "Can I become a mentor?", a: "Yes. Create a mentor account and complete your profile. It goes live once an admin approves it." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-[1100px] scroll-mt-20 px-5 py-20">
      <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
        <FadeIn>
          <Eyebrow>05 · FAQ</Eyebrow>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">Questions, answered.</h2>
        </FadeIn>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q}>
                <button type="button" className="group flex min-h-12 w-full items-center justify-between gap-6 py-3 text-left" aria-expanded={isOpen} aria-controls={`faq-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                  <span className="text-[14px] font-medium text-white/90 transition-colors group-hover:text-white">{it.q}</span>
                  <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 text-white/50 group-hover:text-white"><Plus className="h-4 w-4" aria-hidden /></motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div id={`faq-${i}`} key="content" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }} className="overflow-hidden">
                      <p className="pb-4 pr-10 text-[13px] leading-6 text-muted-foreground">{it.a}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
