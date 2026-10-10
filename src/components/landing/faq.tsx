"use client";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";

const items = [
  { q: "Is Mentio free to use?", a: "Yes. Every session is free during the beta. Paid sessions will only launch once payments are fully in place, and you'll see the price before you book." },
  { q: "How are mentors vetted?", a: "An admin reviews each mentor profile before it goes live. Ratings only come from students who completed a session." },
  { q: "What if a mentor cancels?", a: "You're notified by email and in your dashboard, and you can book another time or another mentor." },
  { q: "Can I reschedule?", a: "Yes, any time before the session starts, from your bookings page." },
  { q: "Can I become a mentor?", a: "Yes. Create a mentor account and complete your profile. It goes live once an admin approves it." },
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
                  className="flex min-h-11 w-full items-start justify-between gap-6 rounded-md text-left"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="py-2.5 font-medium">{it.q}</span>
                  {isOpen ? <Minus className="mt-1 h-4 w-4" /> : <Plus className="mt-1 h-4 w-4" />}
                </button>
                {isOpen ? <p id={`faq-${i}`} className="mt-3 text-sm text-muted-foreground">{it.a}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
