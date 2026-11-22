"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { CategoryIcon } from "@/components/shared/icons";
import { SpotlightCard, ease } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export type CategoryTile = { id: string; slug: string; name: string; description: string | null; icon: string | null; color: string | null; mentorCount: number };

/** Animated category grid. The first two tiles are wide on large screens (bento layout). */
export function CategoryGrid({ categories, heading = true }: { categories: CategoryTile[]; heading?: boolean }) {
  return (
    <section className="container py-24" aria-labelledby={heading ? "categories-heading" : undefined}>
      {heading ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6, ease }}
          className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-violet-300/80">Step 1 · Pick a path</p>
            <h2 id="categories-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
              What do you want to <span className="text-gradient-animated">grow in?</span>
            </h2>
          </div>
          <Link href="/categories" className="group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-white">
            All categories <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </motion.div>
      ) : null}

      <motion.ul
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-5%" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", heading && "mt-12")}
      >
        {categories.map((c, i) => {
          const color = c.color ?? "#8b5cf6";
          const wide = i < 2;
          return (
            <motion.li
              key={c.id}
              variants={{ hidden: { opacity: 0, y: 24, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease } } }}
              className={cn(wide && "lg:col-span-2")}
            >
              <Link href={`/mentors?category=${c.slug}`} className="group block h-full rounded-3xl focus-visible:outline-offset-4">
                <SpotlightCard
                  color={`${color}33`}
                  className={cn(
                    "surface relative h-full overflow-hidden rounded-3xl p-6 transition duration-300 group-hover:-translate-y-1 group-hover:border-white/20",
                    wide ? "min-h-[13rem]" : "min-h-[11.5rem]",
                  )}
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-25 blur-3xl transition-opacity duration-500 group-hover:opacity-60" style={{ background: color }} aria-hidden />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110" style={{ background: `${color}22` }}>
                        <CategoryIcon name={c.icon} className="h-5 w-5" style={{ color }} />
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70">
                        {c.mentorCount} {c.mentorCount === 1 ? "mentor" : "mentors"}
                      </span>
                    </div>
                    <div className="mt-auto pt-8">
                      <h3 className={cn("font-display font-semibold text-white", wide ? "text-2xl" : "text-lg")}>{c.name}</h3>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-white/70 transition-all group-hover:gap-2 group-hover:text-white">
                        See mentors <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </div>
                  </div>
                </SpotlightCard>
              </Link>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}

/** Endless strip of category names, used as a divider under the hero. */
export function CategoryMarquee({ categories }: { categories: CategoryTile[] }) {
  if (categories.length === 0) return null;
  const items = [...categories, ...categories];
  return (
    <div className="mask-fade-x relative overflow-hidden border-y border-white/[0.06] bg-white/[0.015] py-5" aria-hidden>
      <div className="marquee flex w-max gap-10" style={{ "--marquee-duration": "45s" } as React.CSSProperties}>
        {items.map((c, i) => (
          <span key={`${c.id}-${i}`} className="inline-flex items-center gap-2.5 whitespace-nowrap text-sm text-white/45">
            <CategoryIcon name={c.icon} className="h-4 w-4" style={{ color: c.color ?? undefined }} />
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}
