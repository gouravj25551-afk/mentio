"use client";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";

const items = [
  { q: "Is Mentio free to use?", a: "Browsing and booking are free today. Payments arrive in a future phase — your existing bookings and flows continue to work when they do." },
  { q: "How are mentors vetted?", a: "Every mentor profile is reviewed by our team. We check background, outcomes, and real reviews from past sessions." },
  { q: "What if a mentor cancels?", a: "You're automatically notified and can rebook with the same or a different mentor in one click. No support tickets." },
  { q: "Can I reschedule?", a: "Yes. Up to the session start — one click from your dashboard." },
  { q: "Do mentors see each other's rates?", a: "No. Pricing is set per mentor, visible only to students on the mentor profile." },
  { q: "Can I become a mentor?", a: "Yes. Apply from the Mentors page — approval typically takes 48 hours." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="container py-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">FAQ</div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Common questions.</h2>
        </div>
        <div className="mt-10 divide-y rounded-xl border bg-card">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q} className="px-6 py-5">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-6 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="font-medium">{it.q}</span>
                  {isOpen ? <Minus className="mt-1 h-4 w-4" /> : <Plus className="mt-1 h-4 w-4" />}
                </button>
                {isOpen ? <p className="mt-3 text-sm text-muted-foreground">{it.a}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
