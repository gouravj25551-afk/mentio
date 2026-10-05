// OAuth connection for Cal.com / Calendly. DISABLED unless CALENDAR_OAUTH_ENABLED=true.
//
// This stores a mentor's connection and keeps it healthy (state check, encrypted
// tokens, refresh). It does NOT create events: nothing in Mentio calls the
// providers' booking APIs, so a connected account changes no booking behaviour.
// The request/response shapes below are written from the providers' public docs
// and have not been exercised against live accounts. Verify them before enabling.
import "server-only";
import crypto from "node:crypto";
import type { CalendarConnection, CalendarProvider } from "@prisma/client";
import { z } from "zod";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env, isCalComEnabled, isCalendlyEnabled } from "@/lib/env";

export type ProviderSlug = "cal-com" | "calendly";

type ProviderConfig = {
  provider: CalendarProvider;
  name: string;
  enabled: () => boolean;
  authorizeUrl: string;
  tokenUrl: string;
  clientId: () => string | undefined;
  clientSecret: () => string | undefined;
  json: boolean; // token endpoint body encoding
};

export const PROVIDERS: Record<ProviderSlug, ProviderConfig> = {
  "cal-com": {
    provider: "CAL_COM",
    name: "Cal.com",
    enabled: () => isCalComEnabled,
    authorizeUrl: "https://app.cal.com/auth/oauth2/authorize",
    tokenUrl: "https://api.cal.com/v2/oauth/token",
    clientId: () => env.CAL_COM_CLIENT_ID,
    clientSecret: () => env.CAL_COM_CLIENT_SECRET,
    json: true,
  },
  calendly: {
    provider: "CALENDLY",
    name: "Calendly",
    enabled: () => isCalendlyEnabled,
    authorizeUrl: "https://auth.calendly.com/oauth/authorize",
    tokenUrl: "https://auth.calendly.com/oauth/token",
    clientId: () => env.CALENDLY_CLIENT_ID,
    clientSecret: () => env.CALENDLY_CLIENT_SECRET,
    json: false,
  },
};

/** Narrows an untrusted URL segment to a known provider. */
export function providerFromSlug(slug: string): ProviderConfig | null {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, slug) ? PROVIDERS[slug as ProviderSlug] : null;
}

export const redirectUri = (slug: ProviderSlug) => `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/calendars/${slug}/callback`;

// ---- CSRF state ----------------------------------------------------------------

export const STATE_COOKIE = (slug: string) => `mentio_oauth_${slug}`;

export const newState = () => crypto.randomBytes(24).toString("base64url");

/** Constant-time comparison of the `state` query param against the cookie set at /connect. */
export function stateMatches(fromQuery: string | null, fromCookie: string | undefined): boolean {
  if (!fromQuery || !fromCookie) return false;
  const a = Buffer.from(fromQuery);
  const b = Buffer.from(fromCookie);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function authorizeUrl(slug: ProviderSlug, state: string): string {
  const p = PROVIDERS[slug];
  const url = new URL(p.authorizeUrl);
  url.searchParams.set("client_id", p.clientId() ?? "");
  url.searchParams.set("redirect_uri", redirectUri(slug));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

// ---- Tokens --------------------------------------------------------------------

const tokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().positive().optional(),
  owner: z.string().optional(),
  user: z.object({ id: z.union([z.string(), z.number()]).optional() }).optional(),
});

async function requestToken(slug: ProviderSlug, params: Record<string, string>) {
  const p = PROVIDERS[slug];
  const body = { ...params, client_id: p.clientId() ?? "", client_secret: p.clientSecret() ?? "" };
  const res = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "content-type": p.json ? "application/json" : "application/x-www-form-urlencoded" },
    body: p.json ? JSON.stringify(body) : new URLSearchParams(body),
    signal: AbortSignal.timeout(10_000),
  });
  // Never log the response body: it contains the tokens.
  if (!res.ok) throw new Error(`${p.name} token endpoint returned HTTP ${res.status}`);
  return tokenResponse.parse(await res.json());
}

const expiry = (expiresIn?: number) => (expiresIn ? new Date(Date.now() + expiresIn * 1000) : null);

export async function connectWithCode(slug: ProviderSlug, mentorProfileId: string, code: string) {
  const p = PROVIDERS[slug];
  const t = await requestToken(slug, { grant_type: "authorization_code", code, redirect_uri: redirectUri(slug) });
  const data = {
    accessToken: encryptSecret(t.access_token),
    refreshToken: t.refresh_token ? encryptSecret(t.refresh_token) : null,
    expiresAt: expiry(t.expires_in),
    externalId: String(t.owner ?? t.user?.id ?? "unknown"),
    active: true,
  };
  await db.calendarConnection.upsert({
    where: { mentorProfileId_provider: { mentorProfileId, provider: p.provider } },
    update: data,
    create: { mentorProfileId, provider: p.provider, ...data },
  });
}

export type ConnectionHealth = "connected" | "reconnect_needed";

/**
 * Returns a usable access token, refreshing it if it has expired. If the token is
 * missing, can't be decrypted, or can't be refreshed, the connection is marked
 * inactive and null is returned: callers must then treat the account as disconnected.
 */
export async function getAccessToken(conn: CalendarConnection, now = new Date()): Promise<string | null> {
  const token = decryptSecret(conn.accessToken);
  const stillValid = !conn.expiresAt || conn.expiresAt.getTime() - 60_000 > now.getTime();
  if (token && stillValid) return token;

  const refresh = decryptSecret(conn.refreshToken);
  const slug = (Object.keys(PROVIDERS) as ProviderSlug[]).find((s) => PROVIDERS[s].provider === conn.provider);
  if (refresh && slug) {
    try {
      const t = await requestToken(slug, { grant_type: "refresh_token", refresh_token: refresh });
      await db.calendarConnection.update({
        where: { id: conn.id },
        data: {
          accessToken: encryptSecret(t.access_token),
          refreshToken: t.refresh_token ? encryptSecret(t.refresh_token) : conn.refreshToken,
          expiresAt: expiry(t.expires_in),
          active: true,
        },
      });
      return t.access_token;
    } catch (err) {
      console.error("calendar token refresh failed:", err instanceof Error ? err.message : err);
    }
  }
  await db.calendarConnection.update({ where: { id: conn.id }, data: { active: false } });
  return null;
}

export async function connectionHealth(conn: CalendarConnection): Promise<ConnectionHealth> {
  return (await getAccessToken(conn)) ? "connected" : "reconnect_needed";
}
