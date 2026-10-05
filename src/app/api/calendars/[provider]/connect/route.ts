import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { authorizeUrl, newState, providerFromSlug, STATE_COOKIE, type ProviderSlug } from "@/services/calendar/oauth";

const back = (req: Request, query: string) => NextResponse.redirect(new URL(`/dashboard/mentor/calendars?${query}`, req.url));

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: slug } = await ctx.params;
  const provider = providerFromSlug(slug);
  if (!provider || !provider.enabled()) return back(req, "error=unavailable");

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", req.url));
  if (user.role !== "MENTOR") return back(req, "error=forbidden");

  // A random value bound to THIS browser. The callback only proceeds if the
  // provider echoes it back, which stops an attacker from feeding a victim's
  // session an authorization code that belongs to the attacker's account.
  const state = newState();
  const res = NextResponse.redirect(authorizeUrl(slug as ProviderSlug, state));
  res.cookies.set(STATE_COOKIE(slug), state, {
    httpOnly: true,
    secure: env.NEXT_PUBLIC_APP_URL.startsWith("https://"),
    sameSite: "lax", // must survive the redirect back from the provider
    path: "/api/calendars",
    maxAge: 600,
  });
  return res;
}
