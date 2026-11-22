"use client";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SpotlightCard, TiltCard } from "@/components/motion/primitives";
import { SOCIAL_ICONS } from "@/components/shared/icons";
import { displayPrice } from "@/lib/pricing";
import { socialLinks } from "@/lib/socials";
import { initials } from "@/lib/utils";

export type MentorCardData = {
  id: string;
  slug: string;
  headline: string;
  featured: boolean;
  averageRating: number;
  totalReviews: number;
  totalSessions: number;
  sessionLength: number;
  rateCents: number;
  currency: string;
  user: {
    name: string | null;
    image: string | null;
    profile?: { twitter?: string | null; instagram?: string | null; linkedin?: string | null; github?: string | null; website?: string | null } | null;
  };
  categories: { categoryId: string; category: { name: string; color: string | null } }[];
  skills?: { skillId: string; skill: { name: string } }[];
};

/**
 * The whole card opens the profile (stretched link on the name), while the
 * social icons stay separately clickable above it.
 */
export function MentorCard({ mentor }: { mentor: MentorCardData }) {
  const color = mentor.categories[0]?.category.color ?? "#8b5cf6";
  const socials = socialLinks(mentor.user.profile);
  return (
    <TiltCard className="h-full" max={5}>
      <SpotlightCard color={`${color}2e`} className="surface group relative flex h-full flex-col overflow-hidden rounded-3xl transition duration-300 hover:border-white/20">
        <div className="relative h-20 overflow-hidden" aria-hidden>
          <div className="absolute inset-0 opacity-70 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `radial-gradient(120% 140% at 0% 0%, ${color}66, transparent 60%), radial-gradient(100% 120% at 100% 0%, #22d3ee33, transparent 60%)` }} />
          <div className="absolute inset-0 grid-bg opacity-30" />
          {mentor.featured ? (
            <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">Featured</span>
          ) : null}
        </div>

        <div className="relative -mt-9 flex flex-1 flex-col px-5 pb-5">
          <div className="relative w-fit">
            <span className="absolute -inset-1 rounded-full opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-80" style={{ background: color }} aria-hidden />
            <Avatar className="relative h-[4.5rem] w-[4.5rem] border-4 border-[#0b0e20] shadow-xl">
              <AvatarImage src={mentor.user.image ?? undefined} alt="" />
              <AvatarFallback className="text-lg font-semibold text-white" style={{ background: `linear-gradient(135deg, ${color}, #1e1b4b)` }}>{initials(mentor.user.name)}</AvatarFallback>
            </Avatar>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <Link href={`/mentors/${mentor.slug}`} className="truncate font-display text-lg font-semibold text-white after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
              {mentor.user.name}
            </Link>
            <BadgeCheck className="h-4 w-4 shrink-0 text-violet-300" aria-label="Verified mentor" role="img" />
          </div>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{mentor.headline}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {mentor.categories.slice(0, 3).map((c) => (
              <span key={c.categoryId} className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium" style={{ borderColor: `${c.category.color ?? color}40`, color: c.category.color ?? color, background: `${c.category.color ?? color}14` }}>
                {c.category.name}
              </span>
            ))}
          </div>

          {socials.length ? (
            <div className="relative z-10 mt-4 flex items-center gap-1.5">
              {socials.map((s) => {
                const Icon = SOCIAL_ICONS[s.kind];
                return (
                  <a key={s.kind} href={s.href} target="_blank" rel="noreferrer noopener" aria-label={`${mentor.user.name} on ${s.label}`} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition hover:-translate-y-0.5 hover:border-white/25 hover:text-white">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </a>
                );
              })}
            </div>
          ) : null}

          <div className="min-h-4 flex-1" aria-hidden />
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {mentor.totalReviews > 0 ? (
                <span className="inline-flex items-center gap-1 text-white"><Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden />{mentor.averageRating.toFixed(1)}<span className="text-muted-foreground">({mentor.totalReviews})</span></span>
              ) : (
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-300">New</span>
              )}
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{mentor.sessionLength}m</span>
              <span className="font-medium text-white">{displayPrice(mentor.rateCents, mentor.currency)}</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white transition-all group-hover:gap-2 group-hover:bg-violet-500/90">
              Book <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
        </div>
      </SpotlightCard>
    </TiltCard>
  );
}
