"use client";
import * as React from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { CalendarCheck2, Compass, UserRoundSearch } from "lucide-react";

import { ease } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Compass, title: "Pick a category", desc: "Open source, GSoC, interview prep, AI/ML, design, startups… start with what you want to grow in.", tint: "#a78bfa" },
  { icon: UserRoundSearch, title: "Meet the mentor", desc: "Read their story, skills and reviews, and check their LinkedIn, GitHub or X before you book.", tint: "#67e8f9" },
  { icon: CalendarCheck2, title: "Book the call", desc: "Choose a time from their real availability, shown in your timezone. Confirmed instantly, with a meeting link.", tint: "#f0abfc" },
];

const TIMES = ["10:00 AM", "10:30 AM", "5:00 PM", "5:30 PM", "6:00 PM", "7:30 PM"];

export function HowItWorks() {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="how-it-works" className="relative scroll-mt-24 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-1/3 -z-10 h-96 bg-[radial-gradient(closest-side,hsl(262_90%_60%/0.12),transparent)]" aria-hidden />
      <div className="container grid gap-16 lg:grid-cols-2 lg:items-center">
        <div>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease }}>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-fuchsia-300/80">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">From curious to <span className="text-gradient">booked</span> in a minute.</h2>
          </motion.div>

          <div ref={ref} className="relative mt-12 pl-14">
            <div className="absolute bottom-6 left-[1.35rem] top-6 w-px bg-white/10" aria-hidden />
            <motion.div style={{ height: reduce ? "100%" : fill }} className="absolute left-[1.35rem] top-6 w-px bg-gradient-to-b from-violet-400 via-cyan-300 to-fuchsia-300" aria-hidden />
            <ol className="space-y-10">
              {STEPS.map((s, i) => (
                <motion.li
                  key={s.title}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-20%" }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease }}
                  className="relative"
                >
                  <span className="absolute -left-14 top-0 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#0c1024] shadow-lg" style={{ boxShadow: `0 0 30px -8px ${s.tint}` }}>
                    <s.icon className="h-5 w-5" style={{ color: s.tint }} aria-hidden />
                  </span>
                  <p className="text-xs text-white/40">0{i + 1}</p>
                  <h3 className="font-display text-xl font-semibold text-white">{s.title}</h3>
                  <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">{s.desc}</p>
                </motion.li>
              ))}
            </ol>
          </div>
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
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: -1.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.8, ease }}
      className="relative mx-auto w-full max-w-md"
      aria-hidden
    >
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-violet-500/20 via-transparent to-cyan-400/15 blur-2xl" />
      <div className="surface rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-900 text-sm font-semibold">AM</span>
          <div>
            <div className="text-sm font-semibold text-white">Aarav · GSoC mentor</div>
            <div className="text-xs text-white/50">30 min · Google Meet</div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-5 gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
            <div key={d} className={cn("relative flex h-14 flex-col items-center justify-center rounded-xl border text-xs transition-colors duration-300", i === day ? "border-transparent text-white" : "border-white/10 text-white/60")}>
              {i === day ? <motion.span layoutId="demo-day" className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600" transition={{ type: "spring", stiffness: 300, damping: 28 }} /> : null}
              <span className="opacity-70">{d}</span>
              <span className="font-semibold">{12 + i}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {TIMES.map((t, i) => (
            <motion.div
              key={t}
              animate={{ opacity: day >= 0 ? 1 : 0.35, scale: i === time ? 1.04 : 1 }}
              className={cn("rounded-lg border py-2 text-center text-xs transition-colors", i === time ? "border-violet-300/60 bg-violet-500/20 text-white" : "border-white/10 text-white/60")}
            >
              {t}
            </motion.div>
          ))}
        </div>
        <motion.div
          animate={{ backgroundColor: confirmed ? "rgba(16,185,129,0.18)" : "rgba(139,92,246,0.9)" }}
          className="mt-5 flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-white"
        >
          {confirmed ? "✓ Booked: Wed 14 · 6:00 PM" : "Book a call"}
        </motion.div>
      </div>
    </motion.div>
  );
}
