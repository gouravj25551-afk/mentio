import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { publicUser } from "@/lib/public-select";

export type DiscoveryParams = {
  q?: string;
  category?: string;
  skill?: string;
  sort?: "recommended" | "rating" | "sessions" | "newest";
  page?: number;
  perPage?: number;
};

export async function listMentors(params: DiscoveryParams) {
  const perPage = Math.min(Math.max(params.perPage ?? 12, 1), 48);
  const page = Math.max(params.page ?? 1, 1);

  const q = params.q?.trim().slice(0, 100);
  const where: Prisma.MentorProfileWhereInput = {
    status: "APPROVED",
    acceptingBookings: true,
    ...(q
      ? {
          OR: [
            { headline: { contains: q, mode: "insensitive" } },
            { bio: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(params.category
      ? { categories: { some: { category: { slug: params.category } } } }
      : {}),
    ...(params.skill ? { skills: { some: { skill: { slug: params.skill } } } } : {}),
  };

  const orderBy: Prisma.MentorProfileOrderByWithRelationInput[] =
    params.sort === "rating"
      ? [{ averageRating: "desc" }, { totalReviews: "desc" }]
      : params.sort === "sessions"
      ? [{ totalSessions: "desc" }]
      : params.sort === "newest"
      ? [{ createdAt: "desc" }]
      : [{ featured: "desc" }, { averageRating: "desc" }, { totalSessions: "desc" }];

  const [mentors, total] = await Promise.all([
    db.mentorProfile.findMany({
      where,
      orderBy,
      include: {
        user: { select: publicUser },
        categories: { include: { category: true } },
        skills: { include: { skill: true } },
      },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.mentorProfile.count({ where }),
  ]);

  return { mentors, total, page, perPage, pageCount: Math.max(1, Math.ceil(total / perPage)) };
}

/** A mentor's public profile. Only public user fields are loaded: never email or credentials. */
export async function getMentorBySlug(slug: string) {
  return db.mentorProfile.findUnique({
    where: { slug },
    include: {
      user: {
        select: { ...publicUser, profile: { select: { twitter: true, linkedin: true, github: true, website: true, location: true, languages: true } } },
      },
      categories: { include: { category: true } },
      skills: { include: { skill: true } },
      reviews: {
        include: { author: { select: publicUser } },
        orderBy: { createdAt: "desc" },
        take: 25,
      },
    },
  });
}

export async function getRatingDistribution(mentorProfileId: string) {
  const rows = await db.review.groupBy({
    by: ["rating"],
    where: { mentorProfileId },
    _count: { rating: true },
  });
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) dist[r.rating] = r._count.rating;
  return dist;
}
