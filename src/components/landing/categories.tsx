"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { CategoryIcon } from "@/components/shared/icons";
import { Eyebrow, FadeIn, itemVariants, listVariants } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export type CategoryTile = { id: string; slug: string; name: string; description: string | null; icon: string | null; color: string | null; mentorCount: number };

/** Category grid: icon, name, mentor count. Hover brightens the border and nudges the arrow. */
export function CategoryGrid({ categories, heading = true }: { categories: CategoryTile[]; heading?: boolean }) {
  return (
    <section className="mx-auto max-w-[1100px] px-5 py-20" aria-labelledby={heading ? "categories-heading" : undefined}>
      {heading ? (
        <FadeIn className="flex items-end justify-between gap-4">
          <div>
            <Eyebrow>01 · Pick a path</Eyebrow>
            <h2 id="categories-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">What do you want to grow in?</h2>
          </div>
          <Link href="/categories" className="hidden items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-white sm:inline-flex">All categories <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></Link>
        </FadeIn>
      ) : null}
      <motion.ul
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-5%" }}
        variants={listVariants}
        className={cn("grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3", heading && "mt-10")}
      >
        {categories.map((c) => (
          <motion.li key={c.id} variants={itemVariants} className="bg-black">
            <Link href={`/mentors?category=${c.slug}`} className="group relative flex h-full flex-col gap-6 p-5 transition-colors hover:bg-white/[0.04]">
              <div className="flex items-start justify-between">
                <CategoryIcon name={c.icon} className="h-4 w-4 text-white/70 transition-colors group-hover:text-white" />
                <span className="font-mono text-[11px] text-muted-foreground">{String(c.mentorCount).padStart(2, "0")}</span>
              </div>
              <div>
                <h3 className="flex items-center gap-1 text-[15px] font-medium">
                  {c.name}
                  <ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 text-white/0 transition-all group-hover:translate-x-0 group-hover:text-white/70" aria-hidden />
                </h3>
                <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">{c.description}</p>
              </div>
            </Link>
          </motion.li>
        ))}
        {/* Fillers keep the last row's empty cells black instead of showing the grid lines' colour. */}
        {Array.from({ length: (3 - (categories.length % 3)) % 3 }).map((_, i) => (
          <li key={`f3-${i}`} aria-hidden className="hidden bg-black lg:block" />
        ))}
        {Array.from({ length: (2 - (categories.length % 2)) % 2 }).map((_, i) => (
          <li key={`f2-${i}`} aria-hidden className="hidden bg-black sm:block lg:hidden" />
        ))}
      </motion.ul>
    </section>
  );
}

/** Endless strip of category names, used as a divider under the hero. */
export function CategoryMarquee({ categories }: { categories: CategoryTile[] }) {
  if (categories.length === 0) return null;
  const items = [...categories, ...categories];
  return (
    <div className="mask-fade-x relative overflow-hidden border-y border-white/10 py-3.5" aria-hidden>
      <div className="marquee flex w-max gap-8" style={{ "--marquee-duration": "55s" } as React.CSSProperties}>
        {items.map((c, i) => (
          <span key={`${c.id}-${i}`} className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">
            <span className="h-1 w-1 rounded-full bg-white/30" />
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}
