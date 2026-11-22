"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { MentorCard, type MentorCardData } from "@/components/mentor/mentor-card";
import { ease } from "@/components/motion/primitives";

export function FeaturedMentors({ mentors }: { mentors: MentorCardData[] }) {
  if (!mentors.length) return null;
  return (
    <section className="container py-24" aria-labelledby="featured-heading">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6, ease }}
        className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-cyan-300/80">Step 2 · Meet your mentor</p>
          <h2 id="featured-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
            People who&apos;ve <span className="text-gradient">been there.</span>
          </h2>
        </div>
        <Link href="/mentors" className="group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-white">
          Browse all mentors <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </motion.div>
      <motion.ul
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-5%" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {mentors.map((m) => (
          <motion.li key={m.id} variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}>
            <MentorCard mentor={m} />
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
