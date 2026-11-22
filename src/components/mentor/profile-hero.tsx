"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, Clock, Globe, Languages, MapPin, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CountUp, WordReveal, ease } from "@/components/motion/primitives";
import { CategoryIcon, SOCIAL_ICONS } from "@/components/shared/icons";
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
  const c = mentor.color;
  return (
    <section className="relative">
      {/* Banner */}
      <div className="noise relative -mt-[4.75rem] h-64 overflow-hidden md:h-72" aria-hidden>
        <motion.div
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease }}
          className="absolute inset-0"
          style={{ background: `radial-gradient(60% 120% at 15% 0%, ${c}88, transparent 60%), radial-gradient(50% 110% at 90% 10%, #22d3ee44, transparent 60%), radial-gradient(40% 80% at 55% 100%, #a855f733, transparent 70%)` }}
        />
        <div className="absolute inset-0 grid-bg opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container relative -mt-40 md:-mt-44">
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease }}>
          <Link href="/mentors" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3.5 text-sm text-white/75 backdrop-blur transition hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden /> All mentors
          </Link>
        </motion.div>

        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            className="relative w-fit"
          >
            <div className="ring-animated rounded-full p-[3px]">
              <Avatar className="h-32 w-32 border-4 border-background shadow-2xl md:h-36 md:w-36">
                <AvatarImage src={mentor.image ?? undefined} alt={mentor.name} />
                <AvatarFallback className="text-3xl font-semibold text-white" style={{ background: `linear-gradient(135deg, ${c}, #1e1b4b)` }}>{initials(mentor.name)}</AvatarFallback>
              </Avatar>
            </div>
            <span className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-emerald-400" title="Accepting bookings" aria-hidden />
          </motion.div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
                <WordReveal text={mentor.name} delay={0.2} />
              </h1>
              <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.5 }}>
                <BadgeCheck className="h-6 w-6 text-violet-300" aria-label="Verified mentor" role="img" />
              </motion.span>
              {mentor.featured ? <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-200">Featured</span> : null}
            </div>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35, ease }} className="mt-1.5 text-lg text-white/70">
              {mentor.headline}
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }} className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {mentor.location ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden />{mentor.location}</span> : null}
              <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" aria-hidden />{mentor.timezone}</span>
              {mentor.languages.length ? <span className="inline-flex items-center gap-1.5"><Languages className="h-3.5 w-3.5" aria-hidden />{mentor.languages.join(", ")}</span> : null}
            </motion.div>
          </div>

          {actions ? <div className="flex items-center gap-2 pb-1">{actions}</div> : null}
        </div>

        {/* Categories + socials */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.55 } } }}
          className="mt-6 flex flex-wrap items-center gap-2"
        >
          {mentor.categories.map((cat) => (
            <motion.span key={cat.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
              <Link href={`/mentors?category=${cat.slug}`} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition hover:brightness-125" style={{ borderColor: `${cat.color ?? c}55`, color: cat.color ?? c, background: `${cat.color ?? c}14` }}>
                <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />{cat.name}
              </Link>
            </motion.span>
          ))}
        </motion.div>

        {mentor.socials.length ? (
          <div className="mt-6">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Find {mentor.name.split(" ")[0]} on</h2>
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.7 } } }}
              className="mt-3 flex flex-wrap gap-2"
            >
              {mentor.socials.map((s) => {
                const Icon = SOCIAL_ICONS[s.kind];
                return (
                  <motion.li key={s.kind} variants={{ hidden: { opacity: 0, y: 10, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease } } }}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group inline-flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] py-2 pl-2 pr-4 transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-white/80 transition group-hover:bg-violet-500/80 group-hover:text-white">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="leading-tight">
                        <span className="block text-[11px] text-white/45">{s.label}</span>
                        <span className="block text-sm font-medium text-white">{s.handle}</span>
                      </span>
                    </a>
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>
        ) : null}

        {/* Stats */}
        <motion.dl
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease }}
          className="surface mt-8 grid grid-cols-2 divide-white/[0.07] rounded-2xl sm:grid-cols-4 sm:divide-x"
        >
          <Stat label="Rating" icon={<Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden />}>
            {mentor.totalReviews > 0 ? <CountUp value={mentor.averageRating} decimals={1} /> : "New"}
          </Stat>
          <Stat label="Reviews"><CountUp value={mentor.totalReviews} /></Stat>
          <Stat label="Sessions"><CountUp value={mentor.totalSessions} /></Stat>
          <Stat label="Usually replies" icon={<Clock className="h-4 w-4 text-cyan-300" aria-hidden />}>
            <span>in {mentor.responseTimeHrs}h</span>
          </Stat>
        </motion.dl>
      </div>
    </section>
  );
}

function Stat({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 font-display text-2xl font-semibold text-white">{icon}{children}</dd>
    </div>
  );
}
