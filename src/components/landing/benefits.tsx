"use client";
import { motion } from "framer-motion";
import { Globe2, HeartHandshake, ShieldCheck, Zap } from "lucide-react";

import { Eyebrow, FadeIn, itemVariants, listVariants } from "@/components/motion/primitives";

const ITEMS = [
  { icon: ShieldCheck, title: "Vetted mentors only", desc: "Every profile is reviewed before it goes live. Ratings only come from completed sessions." },
  { icon: Zap, title: "Instant booking", desc: "No request-and-wait. Pick a slot and it's confirmed. Reschedule or cancel from your dashboard." },
  { icon: Globe2, title: "Timezone-aware", desc: "Mentors set hours in their timezone. You always see times in yours." },
  { icon: HeartHandshake, title: "Real conversations", desc: "Thirty focused minutes with someone who has done what you're trying to do." },
];

export function Benefits() {
  return (
    <section className="mx-auto max-w-[1100px] px-5 py-20" aria-labelledby="benefits-heading">
      <FadeIn>
        <Eyebrow>04 · Why Mentio</Eyebrow>
        <h2 id="benefits-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">Built for people who build.</h2>
      </FadeIn>
      <motion.ul initial="hidden" whileInView="show" viewport={{ once: true, margin: "-5%" }} variants={listVariants} className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((it) => (
          <motion.li key={it.title} variants={itemVariants} className="group bg-black p-5 transition-colors hover:bg-white/[0.04]">
            <it.icon className="h-4 w-4 text-white/60 transition-colors group-hover:text-white" aria-hidden />
            <h3 className="mt-8 text-[14px] font-medium">{it.title}</h3>
            <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{it.desc}</p>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
