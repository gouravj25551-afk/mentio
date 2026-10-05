import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Rendered per request (and cached by Next) so new mentors appear without a rebuild.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/mentors`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/categories`, changeFrequency: "weekly", priority: 0.7 },
  ];
  try {
    // Only approved mentors are public, so only they are listed.
    const mentors = await db.mentorProfile.findMany({ where: { status: "APPROVED" }, select: { slug: true, updatedAt: true } });
    return [
      ...pages,
      ...mentors.map((m) => ({ url: `${base}/mentors/${m.slug}`, lastModified: m.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ];
  } catch (err) {
    console.error("sitemap: mentor list unavailable:", err instanceof Error ? err.message : err);
    return pages;
  }
}
