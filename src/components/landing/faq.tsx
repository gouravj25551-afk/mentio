"use client";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";

const items = [
  { q: "Is Mentio free to use?", a: "Yes. Mentio is in early access and sessions are free for now. If we add paid sessions later, we'll say so clearly before anything is charged." },
  { q: "How are mentors vetted?", a: "Every mentor applies and is reviewed by a person before their profile is visible to students." },
  { q: "What if I need to cancel?", a: "You can cancel from your dashboard. The other person gets an email." },
  { q: "Can I become a mentor?", a: "Yes. Create a mentor account and fill in your application. Once it's approved you can set your availability." },
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
