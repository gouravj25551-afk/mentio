"use client";
import { motion } from "framer-motion";
import { Globe2, HeartHandshake, ShieldCheck, Zap } from "lucide-react";

import { SpotlightCard, ease } from "@/components/motion/primitives";

const ITEMS = [
  { icon: ShieldCheck, title: "Vetted mentors only", desc: "Every profile is reviewed before it goes live. Ratings only come from completed sessions.", tint: "#a78bfa" },
  { icon: Zap, title: "Instant booking", desc: "No request-and-wait. Pick a slot and it's confirmed. Reschedule or cancel from your dashboard.", tint: "#fcd34d" },
  { icon: Globe2, title: "Timezone-aware", desc: "Mentors set hours in their timezone. You always see times in yours.", tint: "#67e8f9" },
  { icon: HeartHandshake, title: "Real conversations", desc: "Thirty focused minutes with someone who has done what you're trying to do.", tint: "#f0abfc" },
];

export function Benefits() {
  return (
    <section className="container py-24" aria-labelledby="benefits-heading">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease }} className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-violet-300/80">Why Mentio</p>
        <h2 id="benefits-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">Built for people who <span className="text-gradient">build.</span></h2>
      </motion.div>
      <motion.ul
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-5%" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {ITEMS.map((it) => (
          <motion.li key={it.title} variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } } }}>
            <SpotlightCard color={`${it.tint}26`} className="surface group h-full rounded-3xl p-6 transition hover:-translate-y-1 hover:border-white/20">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 transition-transform duration-500 group-hover:scale-110" style={{ background: `${it.tint}1f` }}>
                <it.icon className="h-5 w-5" style={{ color: it.tint }} aria-hidden />
              </span>
              <h3 className="mt-6 font-display text-lg font-semibold text-white">{it.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{it.desc}</p>
            </SpotlightCard>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
