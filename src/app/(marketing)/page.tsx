import { db } from "@/lib/db";
import { Hero } from "@/components/landing/hero";
import { FeaturedMentors } from "@/components/landing/featured-mentors";
import { SocialProof } from "@/components/landing/social-proof";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Categories } from "@/components/landing/categories";
import { Testimonials } from "@/components/landing/testimonials";
import { Benefits } from "@/components/landing/benefits";
import { FAQ } from "@/components/landing/faq";
import { CTA } from "@/components/landing/cta";

export const revalidate = 60;

export default async function LandingPage() {
  const [featured, categories] = await Promise.all([
    db.mentorProfile.findMany({
      where: { status: "APPROVED", featured: true },
      include: { user: true, categories: { include: { category: true } } },
      take: 6,
      orderBy: { averageRating: "desc" },
    }),
    db.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <Hero />
      <SocialProof />
      <FeaturedMentors mentors={featured} />
      <HowItWorks />
      <Categories categories={categories} />
      <Benefits />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
}
