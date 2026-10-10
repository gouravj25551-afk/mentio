import { NextResponse } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";
import { waitlistMode } from "@/lib/waitlist";

// Edge-safe: this only decodes the JWT. It is a first line of defence for
// "are you signed in" and CSRF; every page, route handler and server action
// still authorizes (role, ownership) itself against the database.
const { auth } = NextAuth(authConfig);

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const isProtectedPage = (p: string) => p.startsWith("/dashboard") || p.startsWith("/onboarding");
const isProtectedApi = (p: string) =>
  p.startsWith("/api/me") ||
  p.startsWith("/api/mentors/me") ||
  p.startsWith("/api/bookings") ||
  p.startsWith("/api/reviews") ||
  p.startsWith("/api/notifications") ||
  p.startsWith("/api/admin") ||
  p.startsWith("/api/calendars");

/** Same-origin check for cookie-authenticated, state-changing API calls (CSRF defence in depth). */
function isCrossSiteWrite(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin) {
    try {
      return new URL(origin).host !== host;
    } catch {
      return true;
    }
  }
  return req.headers.get("sec-fetch-site") === "cross-site";
}

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const signedIn = Boolean(req.auth?.user);

  if (waitlistMode && req.auth?.user?.role !== "ADMIN") {
    const available = new Set([
      "/waitlist", "/sign-in", "/sign-up", "/verify-email",
      "/forgot-password", "/reset-password", "/privacy", "/terms",
    ]);

    if (path.startsWith("/api/") && !path.startsWith("/api/auth/") && path !== "/api/health" && path !== "/api/ready") {
      return NextResponse.json({ error: "Mentio is launching soon." }, { status: 503 });
    }
    if (!available.has(path)) {
      return NextResponse.redirect(new URL("/waitlist", nextUrl));
    }
    if (signedIn && (path === "/sign-in" || path === "/sign-up")) {
      return NextResponse.redirect(new URL("/waitlist", nextUrl));
    }
  }

  if (path.startsWith("/api/") && !path.startsWith("/api/auth") && MUTATING.has(req.method) && isCrossSiteWrite(req)) {
    return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  }

  if (!signedIn && isProtectedApi(path)) {
    return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  }

  if (!signedIn && isProtectedPage(path)) {
    const url = new URL("/sign-in", nextUrl);
    url.searchParams.set("next", path + nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (signedIn && (path === "/sign-in" || path === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
