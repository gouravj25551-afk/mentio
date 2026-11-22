"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { MentorCard, type MentorCardData } from "@/components/mentor/mentor-card";
import { Eyebrow, FadeIn, itemVariants, listVariants } from "@/components/motion/primitives";

export function FeaturedMentors({ mentors }: { mentors: MentorCardData[] }) {
  if (!mentors.length) return null;
  return (
    <section className="mx-auto max-w-[1100px] px-5 py-20" aria-labelledby="featured-heading">
      <FadeIn className="flex items-end justify-between gap-4">
        <div>
          <Eyebrow>02 · Meet your mentor</Eyebrow>
          <h2 id="featured-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">People who&apos;ve been there.</h2>
        </div>
        <Link href="/mentors" className="hidden items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-white sm:inline-flex">All mentors <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></Link>
      </FadeIn>
      <motion.ul initial="hidden" whileInView="show" viewport={{ once: true, margin: "-5%" }} variants={listVariants} className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mentors.map((m) => (
          <motion.li key={m.id} variants={itemVariants}><MentorCard mentor={m} /></motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
