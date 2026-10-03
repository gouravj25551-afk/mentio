import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env, isCalComEnabled } from "@/lib/env";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/sign-in", req.url));
  const mentor = await db.mentorProfile.findUnique({ where: { userId: session.user.id } });
  if (!mentor) return NextResponse.redirect(new URL("/dashboard/mentor", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code || !isCalComEnabled) {
    return NextResponse.redirect(new URL("/dashboard/mentor/calendars?error=cal_com", req.url));
  }

  const tokenRes = await fetch("https://api.cal.com/v2/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: env.CAL_COM_CLIENT_ID,
      client_secret: env.CAL_COM_CLIENT_SECRET,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/calendars/cal-com/callback`,
    }),
  }).catch(() => null);
  if (!tokenRes?.ok) return NextResponse.redirect(new URL("/dashboard/mentor/calendars?error=token", req.url));
  const t = (await tokenRes.json()) as { access_token: string; refresh_token?: string; expires_in?: number; user?: { id?: string } };
  await db.calendarConnection.upsert({
    where: { mentorProfileId_provider: { mentorProfileId: mentor.id, provider: "CAL_COM" } },
    update: {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
      externalId: t.user?.id ?? "unknown",
      active: true,
    },
    create: {
      mentorProfileId: mentor.id,
      provider: "CAL_COM",
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
      externalId: t.user?.id ?? "unknown",
    },
  });
  return NextResponse.redirect(new URL("/dashboard/mentor/calendars?connected=cal_com", req.url));
}
