"use client";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

/** The whole card opens the profile (stretched link on the name); social icons stay separately clickable. */
export function MentorCard({ mentor }: { mentor: MentorCardData }) {
  const socials = socialLinks(mentor.user.profile);
  return (
    <div className="group relative flex h-full flex-col rounded-xl border border-white/10 bg-black p-4 transition-colors duration-200 hover:border-white/30 hover:bg-white/[0.03]">
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 border border-white/10">
          <AvatarImage src={mentor.user.image ?? undefined} alt="" />
          <AvatarFallback className="bg-neutral-900 text-xs font-medium text-white">{initials(mentor.user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link href={`/mentors/${mentor.slug}`} className="block truncate text-[14px] font-medium after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-1 focus-visible:after:ring-white">
            {mentor.user.name}
          </Link>
          <p className="mt-0.5 line-clamp-2 min-h-9 text-[13px] leading-[18px] text-muted-foreground">{mentor.headline}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 -translate-x-1 translate-y-1 text-white/0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-white/80" aria-hidden />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {mentor.categories.slice(0, 3).map((c) => (
          <span key={c.categoryId} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/65">{c.category.name}</span>
        ))}
      </div>

      <div className="flex-1" />
      <div className="relative z-10 mt-5 flex items-center justify-between border-t border-white/10 pt-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {mentor.totalReviews > 0 ? (
            <span className="inline-flex items-center gap-1 text-white"><Star className="h-3 w-3 fill-white" aria-hidden />{mentor.averageRating.toFixed(1)}<span className="text-muted-foreground">({mentor.totalReviews})</span></span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">New</span>
          )}
          <span>{mentor.sessionLength} min</span>
          <span className="text-white/80">{displayPrice(mentor.rateCents, mentor.currency)}</span>
        </div>
        <div className="flex items-center gap-1">
          {socials.map((s) => {
            const Icon = SOCIAL_ICONS[s.kind];
            return (
              <a key={s.kind} href={s.href} target="_blank" rel="noreferrer noopener" aria-label={`${mentor.user.name} on ${s.label}`} className="flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
