"use client";
import { motion } from "framer-motion";

import { Eyebrow, WordReveal, ease } from "@/components/motion/primitives";

/** Compact page header shared by the public pages. */
export function PageIntro({ eyebrow, title, accent, description, children }: { eyebrow: string; title: string; accent?: string; description?: string; children?: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-white/10">
      <div className="dots-bg pointer-events-none absolute inset-0 -z-10 opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_65%)]" aria-hidden />
      <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-14 md:pt-20">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </motion.div>
        <h1 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-[-0.035em] md:text-5xl">
          <WordReveal text={title} delay={0.05} />{" "}
          {accent ? <WordReveal text={accent} className="text-white/45" delay={0.2} /> : null}
        </h1>
        {description ? (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3, ease }} className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground">
            {description}
          </motion.p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
