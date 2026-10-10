"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const ease = [0.2, 0.7, 0.2, 1] as const;
const group = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
const rise = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } } };

const cards = [
  { title: "Open Source", desc: "GSoC, LFX, CNCF mentors who've been in your seat." },
  { title: "Interview Prep", desc: "FAANG & startup interviews with people who ship." },
  { title: "Career Pivots", desc: "Switch stacks, roles, cities — with a plan." },
];

export function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative isolate overflow-hidden">
      <div className="aurora absolute inset-0 -z-10" aria-hidden />
      <div
        className="absolute inset-0 -z-10 grid-bg [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]"
        aria-hidden
      />
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-24 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl"
        animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container relative pb-24 pt-16 md:pb-32 md:pt-28">
        <motion.div variants={group} initial="hidden" animate="show" className="mx-auto max-w-4xl text-center">
          <motion.div variants={rise}>
            <Link
              href="/mentors"
              className="group inline-flex min-h-9 items-center gap-2 rounded-full border bg-background/80 px-3.5 py-1.5 text-xs shadow-soft backdrop-blur transition hover:border-foreground/25"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-600" aria-hidden />
              <span>New: GSoC & LFX mentor cohort — now accepting bookings</span>
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </motion.div>
          <motion.h1
            variants={rise}
            className="mt-7 font-display text-[2.75rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.5rem]"
          >
            A direct line to the people you{" "}
            <span className="font-serif-accent brand-text">aspire to become.</span>
          </motion.h1>
          <motion.p variants={rise} className="mx-auto mt-7 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            Book 1:1 calls with GSoC mentors, LFX contributors, Google and Microsoft interns,
            founders, PMs, designers and senior engineers. No cold DMs, no gatekeepers.
          </motion.p>
          <motion.div variants={rise} className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild variant="brand" size="xl">
              <Link href="/mentors">Browse mentors<ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/sign-up?role=MENTOR">Become a mentor</Link>
            </Button>
          </motion.div>
          <motion.p variants={rise} className="mt-6 text-center text-xs text-muted-foreground">
            Free during the beta. No credit card.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease }}
          className="relative mx-auto mt-16 max-w-5xl md:mt-20"
        >
          <div className="absolute -inset-x-6 -bottom-10 top-10 -z-10 rounded-[2rem] bg-gradient-to-b from-violet-500/10 to-transparent blur-2xl" aria-hidden />
          <div className="hairline rounded-3xl border bg-background/60 p-2 shadow-[0_30px_80px_-30px_rgba(76,29,149,0.35)] backdrop-blur">
            <div className="rounded-2xl border bg-gradient-to-br from-background to-muted/40 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {cards.map((c, i) => (
                  <motion.div
                    key={c.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.55 + i * 0.09, ease }}
                    className="lift hairline rounded-xl border bg-background p-5"
                  >
                    <div className="mb-3 flex items-center gap-2" aria-hidden>
                      <span className="h-1.5 w-8 rounded-full brand-gradient" />
                      <span className="h-1.5 w-3 rounded-full bg-muted" />
                    </div>
                    <h2 className="font-medium">{c.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
