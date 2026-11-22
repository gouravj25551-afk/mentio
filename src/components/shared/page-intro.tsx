"use client";
import { motion } from "framer-motion";

import { WordReveal, ease } from "@/components/motion/primitives";

/** Page header with a soft glow and an animated title, shared by the public pages. */
export function PageIntro({ eyebrow, title, accent, description, children }: { eyebrow: string; title: string; accent?: string; description?: string; children?: React.ReactNode }) {
  return (
    <section className="noise relative isolate -mt-[4.75rem] overflow-hidden pt-[4.75rem]">
      <div className="pointer-events-none absolute left-1/2 top-[-14rem] -z-10 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(262_90%_60%/0.28),transparent)] blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_60%)]" aria-hidden />
      <div className="container pb-24 pt-14 text-center md:pt-20">
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="text-xs font-medium uppercase tracking-[0.25em] text-violet-300/80">
          {eyebrow}
        </motion.p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-semibold tracking-[-0.03em] md:text-6xl">
          <WordReveal text={title} delay={0.05} />{" "}
          {accent ? <WordReveal text={accent} className="text-gradient" delay={0.25} /> : null}
        </h1>
        {description ? (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4, ease }} className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
            {description}
          </motion.p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
