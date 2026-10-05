import { db } from "@/lib/db";
import { publicUser } from "@/lib/public-select";
import { Hero } from "@/components/landing/hero";
import { FeaturedMentors } from "@/components/landing/featured-mentors";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Categories } from "@/components/landing/categories";
import { Benefits } from "@/components/landing/benefits";
import { FAQ } from "@/components/landing/faq";
import { CTA } from "@/components/landing/cta";

export const revalidate = 60;

export default async function LandingPage() {
  // The landing page is prerendered at build time, so a database that isn't reachable
  // there must not fail the whole build: render without the dynamic sections instead.
  const [featured, categories] = await Promise.all([
    db.mentorProfile.findMany({
      where: { status: "APPROVED", featured: true },
      include: { user: { select: publicUser }, categories: { include: { category: true } } },
      take: 6,
      orderBy: { averageRating: "desc" },
    }),
    db.category.findMany({ orderBy: { order: "asc" } }),
  ]).catch((err) => {
    console.error("landing page data unavailable:", err instanceof Error ? err.message : err);
    return [[], []] as [never[], never[]];
  });

  return (
    <>
      <Hero />
      <FeaturedMentors mentors={featured} />
      <HowItWorks />
      <Categories categories={categories} />
      <Benefits />
      <FAQ />
      <CTA />
    </>
  );
}
