import { db } from "@/lib/db";
import { Hero } from "@/components/landing/hero";
import { FeaturedMentors } from "@/components/landing/featured-mentors";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Categories } from "@/components/landing/categories";
import { Benefits } from "@/components/landing/benefits";
import { FAQ } from "@/components/landing/faq";
import { CTA } from "@/components/landing/cta";

// Reads the database on each request so `next build` never needs a database connection.
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [featured, categories] = await Promise.all([
    db.mentorProfile.findMany({
      where: { status: "APPROVED", featured: true, acceptingBookings: true },
      include: { user: true, categories: { include: { category: true } } },
      take: 6,
      orderBy: { averageRating: "desc" },
    }),
    db.category.findMany({ orderBy: { order: "asc" } }),
  ]);

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
