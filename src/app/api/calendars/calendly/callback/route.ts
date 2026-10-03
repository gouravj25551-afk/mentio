import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env, isCalendlyEnabled } from "@/lib/env";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/sign-in", req.url));
  const mentor = await db.mentorProfile.findUnique({ where: { userId: session.user.id } });
  if (!mentor) return NextResponse.redirect(new URL("/dashboard/mentor", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code || !isCalendlyEnabled) {
    return NextResponse.redirect(new URL("/dashboard/mentor/calendars?error=calendly", req.url));
  }

  const tokenRes = await fetch("https://auth.calendly.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: env.CALENDLY_CLIENT_ID!,
      client_secret: env.CALENDLY_CLIENT_SECRET!,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/calendars/calendly/callback`,
    }),
  }).catch(() => null);
  if (!tokenRes?.ok) return NextResponse.redirect(new URL("/dashboard/mentor/calendars?error=token", req.url));
  const t = (await tokenRes.json()) as { access_token: string; refresh_token?: string; expires_in?: number; owner?: string };
  await db.calendarConnection.upsert({
    where: { mentorProfileId_provider: { mentorProfileId: mentor.id, provider: "CALENDLY" } },
    update: {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
      externalId: t.owner ?? "unknown",
      active: true,
    },
    create: {
      mentorProfileId: mentor.id,
      provider: "CALENDLY",
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
      externalId: t.owner ?? "unknown",
    },
  });
  return NextResponse.redirect(new URL("/dashboard/mentor/calendars?connected=calendly", req.url));
}
