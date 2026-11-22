"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CountUp, Eyebrow, RotatingWords, WordReveal, ease } from "@/components/motion/primitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export type HeroMentor = { slug: string; name: string; image: string | null; headline: string; color: string };

const TOPICS = ["GSoC.", "open source.", "interviews.", "AI/ML.", "design.", "startups."];

export function Hero({ mentors, stats }: { mentors: HeroMentor[]; stats: { mentors: number; categories: number; sessions: number } }) {
  const shown = stats.mentors > 0 ? [
    { label: "Mentors", value: stats.mentors, suffix: "" },
    { label: "Categories", value: stats.categories, suffix: "" },
    { label: "Sessions", value: stats.sessions, suffix: "+" },
  ].filter((s) => s.value > 0) : [];
  return (
    <section className="relative isolate overflow-hidden">
      <div className="dots-bg pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_65%)]" aria-hidden />
      <div className="mx-auto max-w-[1100px] px-5 pb-20 pt-20 md:pt-28">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <Eyebrow className="inline-flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" /></span>
            Mentors are taking calls
          </Eyebrow>
        </motion.div>

        <h1 className="mt-6 max-w-3xl font-display text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl md:text-[4.25rem]">
          <WordReveal text="Talk to the people" className="block" delay={0.05} />
          <WordReveal text="you want to become." className="block text-white/45" delay={0.3} />
        </h1>

        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.65, ease }} className="mt-6 max-w-md text-[15px] leading-7 text-muted-foreground">
          1:1 calls with engineers, maintainers and founders. Get unstuck on{" "}
          <RotatingWords words={TOPICS} className="text-white" />
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8, ease }} className="mt-8 flex flex-wrap items-center gap-2.5">
          <Button asChild variant="brand" size="xl"><Link href="/mentors">Find a mentor <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link></Button>
          <Button asChild variant="outline" size="xl"><Link href="/categories">Browse categories</Link></Button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1 }} className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-6 border-t border-white/10 pt-6">
          {mentors.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {mentors.slice(0, 5).map((m) => (
                  <Link key={m.slug} href={`/mentors/${m.slug}`} title={m.name} aria-label={`${m.name}, ${m.headline}`} className="transition-transform hover:z-10 hover:-translate-y-0.5">
                    <Avatar className="h-8 w-8 border-2 border-black">
                      <AvatarImage src={m.image ?? undefined} alt="" />
                      <AvatarFallback className="bg-neutral-800 text-[10px] font-medium text-white">{initials(m.name)}</AvatarFallback>
                    </Avatar>
                  </Link>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">Vetted mentors, one call away</span>
            </div>
          ) : null}
          {shown.map((s) => (
            <div key={s.label} className="flex items-baseline gap-2">
              <span className="font-display text-xl font-semibold"><CountUp value={s.value} suffix={s.suffix} /></span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
