"use client";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { Eyebrow, FadeIn, ease } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Pick a category", desc: "Open source, GSoC, interview prep, AI/ML, design, startups. Start with what you want to grow in." },
  { title: "Meet the mentor", desc: "Read their story, skills and reviews, and check their LinkedIn, GitHub or X before you book." },
  { title: "Book the call", desc: "Choose a time from their real availability, shown in your timezone. Confirmed instantly, with a meeting link." },
];

const TIMES = ["10:00", "10:30", "17:00", "17:30", "18:00", "19:30"];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-[1100px] scroll-mt-20 px-5 py-20">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <FadeIn>
            <Eyebrow>03 · How it works</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">From curious to booked in a minute.</h2>
          </FadeIn>
          <ol className="mt-10 divide-y divide-white/10 border-y border-white/10">
            {STEPS.map((s, i) => (
              <motion.li key={s.title} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-10%" }} transition={{ duration: 0.45, delay: i * 0.06, ease }} className="group flex gap-5 py-5">
                <span className="font-mono text-[11px] text-muted-foreground transition-colors group-hover:text-white">0{i + 1}</span>
                <div>
                  <h3 className="text-[15px] font-medium">{s.title}</h3>
                  <p className="mt-1 max-w-md text-[13px] leading-6 text-muted-foreground">{s.desc}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
        <BookingDemo />
      </div>
    </section>
  );
}

/** A looping, decorative booking flow: a day is picked, then a time, then it confirms. */
function BookingDemo() {
  const reduce = useReducedMotion();
  const [step, setStep] = React.useState(reduce ? 3 : 0);
  React.useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setStep((s) => (s + 1) % 5), 1400);
    return () => clearInterval(t);
  }, [reduce]);
  const day = step >= 1 ? 2 : -1;
  const time = step >= 2 ? 4 : -1;
  const confirmed = step >= 3;

  return (
    <FadeIn className="mx-auto w-full max-w-sm">
      <div aria-hidden className="rounded-xl border border-white/10 bg-black p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-neutral-900 text-[11px] font-medium">AM</span>
          <div>
            <div className="text-[13px] font-medium">Aarav · GSoC mentor</div>
            <div className="text-[11px] text-muted-foreground">30 min · Google Meet</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-5 gap-1.5">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
            <div key={d} className={cn("relative flex h-12 flex-col items-center justify-center rounded-md border text-[11px] transition-colors duration-200", i === day ? "border-transparent text-black" : "border-white/10 text-white/55")}>
              {i === day ? <motion.span layoutId="demo-day" className="absolute inset-0 -z-0 rounded-md bg-white" transition={{ type: "spring", stiffness: 400, damping: 32 }} /> : null}
              <span className="relative opacity-70">{d}</span>
              <span className="relative font-semibold">{12 + i}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {TIMES.map((t, i) => (
            <motion.div key={t} animate={{ opacity: day >= 0 ? 1 : 0.35 }} className={cn("rounded-md border py-1.5 text-center font-mono text-[11px] transition-colors", i === time ? "border-white bg-white/10 text-white" : "border-white/10 text-white/55")}>
              {t}
            </motion.div>
          ))}
        </div>
        <div className={cn("mt-4 flex h-9 items-center justify-center rounded-md text-[13px] font-medium transition-colors duration-300", confirmed ? "border border-white/20 text-white" : "bg-white text-black")}>
          {confirmed ? "✓ Booked · Wed 14 · 18:00" : "Book a call"}
        </div>
      </div>
    </FadeIn>
  );
}
