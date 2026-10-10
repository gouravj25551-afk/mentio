import type { MetadataRoute } from "next";
import { waitlistMode } from "@/lib/waitlist";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: waitlistMode ? ["/waitlist", "/privacy", "/terms"] : "/", disallow: waitlistMode ? ["/dashboard", "/onboarding", "/api/", "/mentors", "/categories", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/verify-email"] : ["/dashboard", "/onboarding", "/api/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/verify-email"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
