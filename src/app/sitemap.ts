import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Queries approved mentors at request time, so `next build` needs no database connection.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const mentors = await db.mentorProfile.findMany({
    where: { status: "APPROVED" },
    select: { slug: true, updatedAt: true },
  });
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/mentors`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/categories`, changeFrequency: "weekly", priority: 0.7 },
    ...mentors.map((m) => ({ url: `${base}/mentors/${m.slug}`, lastModified: m.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
