import { db } from "@/lib/db";
import { publicUser } from "@/lib/public-select";
import { Hero, type HeroMentor } from "@/components/landing/hero";
import { FeaturedMentors } from "@/components/landing/featured-mentors";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CategoryGrid, CategoryMarquee } from "@/components/landing/categories";
import { Benefits } from "@/components/landing/benefits";
import { FAQ } from "@/components/landing/faq";
import { CTA } from "@/components/landing/cta";
import { listCategoriesWithCounts, publicStats } from "@/features/mentors/queries";

export const revalidate = 60;

export default async function LandingPage() {
  // The landing page is prerendered at build time, so a database that isn't reachable
  // there must not fail the whole build: render without the dynamic sections instead.
  const [featured, categories, stats] = await Promise.all([
    db.mentorProfile.findMany({
      where: { status: "APPROVED", featured: true },
      include: {
        user: { select: { ...publicUser, profile: { select: { twitter: true, instagram: true, linkedin: true, github: true, website: true } } } },
        categories: { include: { category: true } },
      },
      take: 6,
      orderBy: { averageRating: "desc" },
    }),
    listCategoriesWithCounts(),
    publicStats(),
  ]).catch((err) => {
    console.error("landing page data unavailable:", err instanceof Error ? err.message : err);
    return [[], [], { mentors: 0, categories: 0, sessions: 0 }] as const;
  });

  const orbit: HeroMentor[] = featured.slice(0, 8).map((m) => ({
    slug: m.slug,
    name: m.user.name ?? "Mentor",
    image: m.user.image,
    headline: m.headline,
    color: m.categories[0]?.category.color ?? "#8b5cf6",
  }));

  return (
    <>
      <Hero mentors={orbit} stats={stats} />
      <CategoryMarquee categories={[...categories]} />
      <CategoryGrid categories={[...categories]} />
      <FeaturedMentors mentors={[...featured]} />
      <HowItWorks />
      <Benefits />
      <FAQ />
      <CTA />
    </>
  );
}
