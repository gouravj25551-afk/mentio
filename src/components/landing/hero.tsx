"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden />
      <div className="absolute left-1/2 top-0 -z-10 h-[720px] w-[1200px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,hsl(263_90%_65%_/_0.25),transparent_60%)]" aria-hidden />
      <div className="container relative pt-20 pb-24 md:pt-28 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <Link
            href="/mentors"
            className="group inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs backdrop-blur transition hover:bg-background"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>New: GSoC & LFX mentor cohort — now accepting bookings</span>
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
          <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
            A direct line to the people you{" "}
            <span className="brand-text">aspire to become.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            Book 1:1 calls with GSoC mentors, LFX contributors, Google and Microsoft interns,
            founders, PMs, designers and senior engineers. No cold DMs, no gatekeepers.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="brand" size="xl">
              <Link href="/mentors">Browse mentors<ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/sign-up?role=MENTOR">Become a mentor</Link>
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-2">
                {[0,1,2,3].map(i => <div key={i} className="h-5 w-5 rounded-full border-2 border-background bg-gradient-to-br from-indigo-400 to-sky-400" />)}
              </div>
              <span>2,000+ students booked</span>
            </div>
            <div className="flex items-center gap-1">
              {[0,1,2,3,4].map(i => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
              <span className="ml-1">4.9 avg rating</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-16 max-w-5xl"
        >
          <div className="relative rounded-2xl border bg-background/40 p-2 shadow-soft backdrop-blur">
            <div className="rounded-xl border bg-gradient-to-br from-background to-muted/30 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  { title: "Open Source", desc: "GSoC, LFX, CNCF mentors who've been in your seat.", stat: "320+", label: "Mentors" },
                  { title: "Interview Prep", desc: "FAANG & startup interviews with people who ship.", stat: "15K+", label: "Mock calls" },
                  { title: "Career Pivots", desc: "Switch stacks, roles, cities — with a plan.", stat: "4.9★", label: "Avg rating" },
                ].map((c) => (
                  <div key={c.title} className="rounded-lg border bg-background p-4">
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-medium">{c.title}</h3>
                      <span className="font-display text-lg font-semibold brand-text">{c.stat}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                    <div className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
