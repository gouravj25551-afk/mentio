import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";

import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, initials } from "@/lib/utils";
import { getMentorBySlug, getRatingDistribution } from "@/features/mentors/queries";
import { getAvailableSlots } from "@/features/bookings/slots";
import { BookingPanel } from "@/components/booking/booking-panel";
import { SaveMentorButton } from "@/components/mentor/save-button";
import { ProfileHero } from "@/components/mentor/profile-hero";
import { ProfileTabs } from "@/components/mentor/profile-tabs";
import { MobileBookBar } from "@/components/mentor/mobile-book-bar";
import { optionalUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { displayPrice, paymentsEnabled } from "@/lib/pricing";
import { socialLinks } from "@/lib/socials";
import { safeTimezone } from "@/lib/time";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const mentor = await getMentorBySlug(slug);
  if (!mentor || mentor.status !== "APPROVED") return { title: "Mentor not found", robots: { index: false } };
  const title = `${mentor.user.name} — ${mentor.headline}`;
  const description = mentor.bio.replace(/\s+/g, " ").slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/mentors/${mentor.slug}` },
    openGraph: { title, description, type: "profile", images: mentor.user.image ? [mentor.user.image] : undefined },
  };
}

export default async function MentorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [mentor, viewer] = await Promise.all([getMentorBySlug(slug), optionalUser()]);
  // Unapproved profiles are only visible to their owner and to admins (a preview).
  const canPreview = viewer && mentor && (viewer.id === mentor.userId || viewer.role === "ADMIN");
  if (!mentor || (mentor.status !== "APPROVED" && !canPreview)) notFound();

  const isStudent = viewer?.role === "STUDENT";
  // Students always book here. Meetings from a connected Cal.com / Calendly
  // account are already removed from these slots (see getAvailableSlots).
  const [slots, dist, saved] = await Promise.all([
    getAvailableSlots({ ...mentor, days: 14 }),
    getRatingDistribution(mentor.id),
    isStudent
      ? db.savedMentor.findUnique({ where: { userId_mentorProfileId: { userId: viewer.id, mentorProfileId: mentor.id } }, select: { id: true } })
      : null,
  ]);
  const mentorTimezone = safeTimezone(mentor.timezone);
  const blockedReason =
    mentor.status !== "APPROVED"
      ? "This profile isn't public yet, so it can't be booked."
      : !mentor.acceptingBookings
        ? "This mentor isn't accepting new bookings right now."
        : mentor.rateCents > 0 && !paymentsEnabled()
          ? "Paid sessions aren't available yet. Mentio is free during the beta."
          : viewer?.id === mentor.userId
            ? "This is your own profile."
            : null;
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  const name = mentor.user.name ?? "Mentor";
  const color = mentor.categories[0]?.category.color ?? "#8b5cf6";

  const about = (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-base font-semibold">About {name.split(" ")[0]}</h2>
        <p className="mt-2.5 whitespace-pre-line text-[14px] leading-7 text-white/65">{mentor.bio}</p>
      </section>
      {mentor.skills.length ? (
        <section>
          <h2 className="font-display text-base font-semibold">Can help you with</h2>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {mentor.skills.map((s) => <span key={s.skillId} className="rounded-full border border-white/12 px-2.5 py-1 text-xs text-white/75">{s.skill.name}</span>)}
          </div>
        </section>
      ) : null}
      {mentor.achievements.length ? (
        <section>
          <h2 className="font-display text-base font-semibold">Highlights</h2>
          <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {mentor.achievements.map((a) => (
              <li key={a} className="rounded-md border border-white/10 p-3.5 text-[13px] leading-6 text-white/75 transition-colors hover:border-white/25">
                {a}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );

  const experience = (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-base font-semibold">Experience</h2>
        <p className="mt-2.5 whitespace-pre-line text-[14px] leading-7 text-white/65">{mentor.experience}</p>
      </section>
      {mentor.portfolio.some((p) => p.startsWith("https://")) ? (
        <section>
          <h2 className="font-display text-base font-semibold">Work &amp; links</h2>
          <ul className="mt-2.5 space-y-1.5 text-[13px]">
            {mentor.portfolio.filter((p) => p.startsWith("https://")).map((p) => (
              <li key={p}><a href={p} target="_blank" rel="noreferrer noopener" className="break-all text-white/70 underline underline-offset-4 hover:text-white">{p}</a></li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );

  const reviews = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-8 rounded-xl border border-white/10 p-5">
        <div>
          <div className="font-display text-4xl font-semibold">{mentor.totalReviews ? mentor.averageRating.toFixed(1) : "–"}</div>
          <div className="mt-1 flex items-center gap-0.5 text-white">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(mentor.averageRating) ? "fill-current" : "opacity-30"}`} aria-hidden />)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{mentor.totalReviews} reviews</div>
        </div>
        <div className="min-w-[200px] flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-3 text-right">{n}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-white" style={{ width: `${total ? (dist[n] / total) * 100 : 0}%` }} />
              </div>
              <span className="w-6 text-right">{dist[n]}</span>
            </div>
          ))}
        </div>
      </div>
      {mentor.reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Reviews come only from students who completed a session.</p>
      ) : (
        <ul className="space-y-3">
          {mentor.reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/10 p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={r.author.image ?? undefined} alt="" />
                  <AvatarFallback>{initials(r.author.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-medium">{r.author.name ?? "Student"}</div>
                    <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-white">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-current" : "opacity-30"}`} aria-hidden />)}
                  </div>
                  {r.comment ? <p className="mt-2 text-[13px] leading-6 text-white/65">{r.comment}</p> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="pb-28 outline-none lg:pb-24">
        <ProfileHero
          mentor={{
            name,
            image: mentor.user.image,
            headline: mentor.headline,
            featured: mentor.featured,
            color,
            timezone: mentorTimezone,
            location: mentor.user.profile?.location ?? null,
            languages: mentor.user.profile?.languages ?? [],
            averageRating: mentor.averageRating,
            totalReviews: mentor.totalReviews,
            totalSessions: mentor.totalSessions,
            responseTimeHrs: mentor.responseTimeHrs,
            categories: mentor.categories.map((c) => ({ id: c.categoryId, slug: c.category.slug, name: c.category.name, icon: c.category.icon, color: c.category.color })),
            socials: socialLinks(mentor.user.profile),
          }}
          actions={isStudent ? <SaveMentorButton mentorProfileId={mentor.id} initialSaved={Boolean(saved)} /> : null}
        />

        <div className="mx-auto mt-10 grid max-w-[1100px] grid-cols-1 gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <ProfileTabs
              tabs={[
                { id: "about", label: "About", content: about },
                { id: "experience", label: "Experience", content: experience },
                { id: "reviews", label: `Reviews (${mentor.totalReviews})`, content: reviews },
              ]}
            />
          </div>
          <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
            <BookingPanel
              mentor={{ id: mentor.id, slug: mentor.slug, name, sessionLength: mentor.sessionLength, timezone: mentorTimezone }}
              slots={slots}
              viewer={viewer ? { role: viewer.role } : null}
              blockedReason={blockedReason}
              priceLabel={displayPrice(mentor.rateCents, mentor.currency)}
              paid={paymentsEnabled() && mentor.rateCents > 0}
            />
          </aside>
        </div>
      </main>
      {!blockedReason ? <MobileBookBar name={name} nextSlot={slots[0]?.startsAt ?? null} /> : null}
      <SiteFooter />
    </>
  );
}
