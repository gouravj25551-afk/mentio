"use client";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, BadgeCheck, CalendarCheck2, Sparkles, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CountUp, RotatingWords, WordReveal, ease } from "@/components/motion/primitives";
import { cn, initials } from "@/lib/utils";

export type HeroMentor = { slug: string; name: string; image: string | null; headline: string; color: string };

const TOPICS = ["GSoC", "open source", "interview prep", "AI/ML", "design", "startups", "career moves"];

export function Hero({ mentors, stats }: { mentors: HeroMentor[]; stats: { mentors: number; categories: number; sessions: number } }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const orbitY = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 80]);
  const glowScale = useTransform(scrollY, [0, 600], [1, reduce ? 1 : 1.25]);

  return (
    <section className="noise relative isolate -mt-[4.75rem] overflow-hidden pt-[4.75rem]">
      {/* Atmosphere */}
      <motion.div style={{ scale: glowScale }} className="pointer-events-none absolute left-1/2 top-[-18rem] -z-10 h-[46rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(262_90%_60%/0.35),transparent)] blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute right-[-10rem] top-40 -z-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,hsl(190_95%_55%/0.16),transparent)] blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_15%,transparent_65%)]" aria-hidden />

      <div className="container relative grid items-center gap-14 pb-24 pt-14 md:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:pb-32">
        <div className="text-center lg:text-left">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
            <Link
              href="/mentors"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-4 text-xs text-white/80 backdrop-blur transition hover:border-violet-300/40 hover:bg-white/[0.07]"
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 font-medium text-violet-200">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" /></span>
                Live
              </span>
              GSoC &amp; LFX mentors are taking calls
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </motion.div>

          <h1 className="mt-7 font-display text-[2.9rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[4.6rem]">
            <WordReveal text="Talk to the people" className="block" delay={0.1} />
            <WordReveal text="you want to become." className="block text-gradient pb-2" delay={0.35} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease }}
            className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg lg:mx-0"
          >
            Book a 1:1 call with GSoC mentors, maintainers, Google &amp; Microsoft engineers and founders.
            <span className="mt-1 block">Get unstuck on <RotatingWords words={TOPICS} className="font-medium text-white" /></span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85, ease }}
            className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start"
          >
            <Button asChild variant="brand" size="xl" className="shine rounded-full">
              <Link href="/mentors">Find your mentor<ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="rounded-full border-white/15 bg-white/[0.03] backdrop-blur hover:bg-white/[0.08]">
              <Link href="/categories">Explore categories</Link>
            </Button>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.05 }}
            className="mx-auto mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6 lg:mx-0"
          >
            {[
              { label: "Vetted mentors", value: stats.mentors, suffix: "" },
              { label: "Categories", value: stats.categories, suffix: "" },
              { label: "Sessions held", value: stats.sessions, suffix: "+" },
            ].filter((s) => s.value > 0).map((s) => (
              <div key={s.label}>
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="mt-1 font-display text-2xl font-semibold text-white"><CountUp value={s.value} suffix={s.suffix} /></dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div style={{ y: orbitY }} className="relative mx-auto hidden aspect-square w-full max-w-[34rem] sm:block">
          <Orbit mentors={mentors} />
        </motion.div>
      </div>
    </section>
  );
}

/** Mentors circling a glowing core. Avatars counter-rotate so they stay upright. */
function Orbit({ mentors }: { mentors: HeroMentor[] }) {
  const inner = mentors.slice(0, 3);
  const outer = mentors.slice(3, 8);
  const ring = (list: HeroMentor[], radius: number, spin: string, counter: string, delay: number) => (
    <div className={cn("absolute inset-0", spin)}>
      {list.map((m, i) => {
        const angle = (i / list.length) * Math.PI * 2;
        return (
          <div
            key={m.slug}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${50 + Math.cos(angle) * radius}%`, top: `${50 + Math.sin(angle) * radius}%` }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: delay + i * 0.12, ease }}
              className={counter}
            >
              <Link href={`/mentors/${m.slug}`} className="group relative block" aria-label={`${m.name}, ${m.headline}`}>
                <span className="absolute -inset-1 rounded-full opacity-60 blur-md transition group-hover:opacity-100" style={{ background: m.color }} aria-hidden />
                <Avatar className="relative h-14 w-14 border-2 border-white/20 shadow-xl">
                  <AvatarImage src={m.image ?? undefined} alt="" />
                  <AvatarFallback className="text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${m.color}, #1e1b4b)` }}>{initials(m.name)}</AvatarFallback>
                </Avatar>
                <span className="pointer-events-none absolute left-1/2 top-full mt-2 w-max max-w-[12rem] -translate-x-1/2 rounded-lg border border-white/10 bg-[#0b0e22]/95 px-2.5 py-1.5 text-center text-[11px] leading-tight text-white/90 opacity-0 shadow-xl transition group-hover:opacity-100">
                  <span className="block font-medium">{m.name}</span>
                  <span className="block text-white/55">{m.headline}</span>
                </span>
              </Link>
            </motion.div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="relative h-full w-full" aria-label="Featured mentors">
      <div className="absolute inset-[6%] rounded-full border border-white/[0.07]" aria-hidden />
      <div className="absolute inset-[24%] rounded-full border border-dashed border-violet-300/15" aria-hidden />
      <div className="absolute inset-[38%] rounded-full bg-[radial-gradient(closest-side,hsl(262_90%_62%/0.45),transparent)] blur-xl" aria-hidden />

      {/* Core card */}
      <div className="absolute left-1/2 top-1/2 z-10 w-52 -translate-x-1/2 -translate-y-1/2">
      <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3, ease }}>
        <div className="float-slow"><div className="ring-animated rounded-2xl">
          <div className="surface rounded-2xl p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-300"><CalendarCheck2 className="h-3.5 w-3.5" aria-hidden /> Call booked</div>
            <div className="mt-2 text-sm font-semibold text-white">GSoC proposal review</div>
            <div className="mt-0.5 text-xs text-white/50">Tomorrow · 7:30 PM · 30 min</div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-white/60">
              <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-violet-300" aria-hidden /> Verified</span>
              <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden /> 4.9</span>
            </div>
          </div>
        </div></div>
      </motion.div>
      </div>

      {ring(inner, 30, "orbit-spin", "counter-spin", 0.5)}
      {ring(outer, 44, "orbit-spin-reverse", "counter-spin-reverse", 0.8)}

      <Sparkles className="float-slow absolute right-[12%] top-[10%] h-5 w-5 text-cyan-200/70" aria-hidden />
    </div>
  );
}
