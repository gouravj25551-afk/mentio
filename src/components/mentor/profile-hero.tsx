"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, Globe, Languages, MapPin, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CountUp, WordReveal, ease } from "@/components/motion/primitives";
import { SOCIAL_ICONS } from "@/components/shared/icons";
import type { SocialLink } from "@/lib/socials";
import { initials } from "@/lib/utils";

export type ProfileHeroData = {
  name: string;
  image: string | null;
  headline: string;
  featured: boolean;
  color: string;
  timezone: string;
  location: string | null;
  languages: string[];
  averageRating: number;
  totalReviews: number;
  totalSessions: number;
  responseTimeHrs: number;
  categories: { id: string; slug: string; name: string; icon: string | null; color: string | null }[];
  socials: SocialLink[];
};

export function ProfileHero({ mentor, actions }: { mentor: ProfileHeroData; actions?: React.ReactNode }) {
  return (
    <section className="border-b border-white/10">
      <div className="mx-auto max-w-[1100px] px-5 pb-8 pt-8">
        <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease }}>
          <Link href="/mentors" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All mentors
          </Link>
        </motion.div>

        <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-center">
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease }} className="w-fit">
            <Avatar className="h-20 w-20 border border-white/15 md:h-24 md:w-24">
              <AvatarImage src={mentor.image ?? undefined} alt={mentor.name} />
              <AvatarFallback className="bg-neutral-900 text-xl font-medium text-white">{initials(mentor.name)}</AvatarFallback>
            </Avatar>
          </motion.div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
                <WordReveal text={mentor.name} delay={0.1} />
              </h1>
              <BadgeCheck className="h-5 w-5 text-white" aria-label="Verified mentor" role="img" />
              {mentor.featured ? <span className="rounded-full border border-white/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/80">Featured</span> : null}
            </div>
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2, ease }} className="mt-1 text-[15px] text-white/65">
              {mentor.headline}
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {mentor.location ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" aria-hidden />{mentor.location}</span> : null}
              <span className="inline-flex items-center gap-1.5"><Globe className="h-3 w-3" aria-hidden />{mentor.timezone}</span>
              {mentor.languages.length ? <span className="inline-flex items-center gap-1.5"><Languages className="h-3 w-3" aria-hidden />{mentor.languages.join(", ")}</span> : null}
            </motion.div>
          </div>

          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-1.5">
          {mentor.categories.map((cat) => (
            <Link key={cat.id} href={`/mentors?category=${cat.slug}`} className="rounded-full border border-white/12 px-2.5 py-1 text-[11px] text-white/70 transition-colors hover:border-white/40 hover:text-white">
              {cat.name}
            </Link>
          ))}
        </div>

        {mentor.socials.length ? (
          <div className="mt-6">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Find {mentor.name.split(" ")[0]} on</h2>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {mentor.socials.map((s) => {
                const Icon = SOCIAL_ICONS[s.kind];
                return (
                  <li key={s.kind}>
                    <a href={s.href} target="_blank" rel="noreferrer noopener" className="group inline-flex h-9 items-center gap-2 rounded-md border border-white/12 px-3 transition-colors hover:border-white/40 hover:bg-white/[0.04]">
                      <Icon className="h-3.5 w-3.5 text-white/60 transition-colors group-hover:text-white" aria-hidden />
                      <span className="text-[11px] text-muted-foreground">{s.label}</span>
                      <span className="text-[13px] font-medium">{s.handle}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <dl className="mt-8 grid grid-cols-2 divide-white/10 border-y border-white/10 sm:grid-cols-4 sm:divide-x">
          <Stat label="Rating">
            {mentor.totalReviews > 0 ? <><Star className="h-3.5 w-3.5 fill-white" aria-hidden /><CountUp value={mentor.averageRating} decimals={1} /></> : "New"}
          </Stat>
          <Stat label="Reviews"><CountUp value={mentor.totalReviews} /></Stat>
          <Stat label="Sessions"><CountUp value={mentor.totalSessions} /></Stat>
          <Stat label="Usually replies"><span>in {mentor.responseTimeHrs}h</span></Stat>
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 first:pl-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 font-display text-lg font-semibold">{children}</dd>
    </div>
  );
}
