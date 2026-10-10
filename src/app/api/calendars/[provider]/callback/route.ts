import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { connectWithCode, providerFromSlug, stateMatches, STATE_COOKIE, type ProviderSlug } from "@/services/calendar/oauth";
import { logError } from "@/lib/log";

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: slug } = await ctx.params;
  const back = (query: string) => {
    const res = NextResponse.redirect(new URL(`/dashboard/mentor/calendars?${query}`, req.url));
    res.cookies.delete({ name: STATE_COOKIE(slug), path: "/api/calendars" }); // single use, success or not
    return res;
  };

  const provider = providerFromSlug(slug);
  if (!provider || !provider.enabled()) return back("error=unavailable");

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", req.url));
  if (user.role !== "MENTOR") return back("error=forbidden");

  const url = new URL(req.url);
  const cookie = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${STATE_COOKIE(slug)}=`))?.split("=")[1];
  if (!stateMatches(url.searchParams.get("state"), cookie)) return back("error=state");
  if (url.searchParams.get("error")) return back("error=denied");

  const code = url.searchParams.get("code");
  if (!code) return back("error=denied");

  const mentor = await db.mentorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!mentor) return back("error=forbidden");

  try {
    await connectWithCode(slug as ProviderSlug, mentor.id, code);
  } catch (err) {
    // Message only: the error never contains the code or tokens.
    logError("calendar.connect_failed", err);
    return back("error=token");
  }
  return back(`connected=${slug}`);
}
