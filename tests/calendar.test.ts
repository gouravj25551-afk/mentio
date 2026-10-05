import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PUT as putMeetingLink } from "@/app/api/mentors/me/meeting-link/route";
import { POST as disconnect } from "@/app/api/calendars/[provider]/disconnect/route";
import { GET as callback } from "@/app/api/calendars/[provider]/callback/route";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { validateMeetingLink } from "@/lib/meeting-links";
import { generateRoomUrl, resolveMeeting } from "@/services/calendar";
import { getAccessToken, stateMatches } from "@/services/calendar/oauth";
import { createMentor, createUser, resetDb } from "./helpers/factories";
import { signInAs } from "./helpers/state";

const KEY = Buffer.alloc(32, 7).toString("base64");

beforeEach(async () => {
  await resetDb();
});

describe("custom meeting links", () => {
  it.each([
    "https://meet.google.com/abc-defg-hij",
    "https://zoom.us/j/123456789?pwd=abc",
    "https://us02web.zoom.us/j/123",
    "https://cal.com/someone/30min",
    "https://calendly.com/someone/chat",
    "https://teams.microsoft.com/l/meetup-join/abc",
  ])("accepts %s", (url) => {
    expect(validateMeetingLink(url)).toMatchObject({ ok: true });
  });

  it.each([
    ["javascript:alert(1)", /https/],
    ["data:text/html,<script>1</script>", /https/],
    ["http://zoom.us/j/1", /https/],
    ["https://evil.example/zoom.us", /Use a link from/],
    ["https://zoom.us.evil.example/j/1", /Use a link from/],
    ["https://evilzoom.us/j/1", /Use a link from/],
    ["https://user:pass@zoom.us/j/1", /username/],
    ["https://zoom.us:8443/j/1", /port/],
    ["https://127.0.0.1/j/1", /Use a link from/],
    ["not a url", /https/],
    [`https://zoom.us/${"a".repeat(400)}`, /too long/],
  ])("rejects %s", (url, message) => {
    const r = validateMeetingLink(url);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(message);
  });

  it("is saved through the API only for mentors, and can be cleared", async () => {
    const { user, mentor } = await createMentor();
    signInAs(user.id);
    const put = (meetingLink: string) =>
      putMeetingLink(new Request("http://x", { method: "PUT", body: JSON.stringify({ meetingLink }) }));

    expect((await put("https://meet.google.com/abc-defg-hij")).status).toBe(200);
    expect((await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } })).meetingLink).toBe("https://meet.google.com/abc-defg-hij");
    expect((await put("javascript:alert(1)")).status).toBe(422);
    expect((await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } })).meetingLink).toBe("https://meet.google.com/abc-defg-hij");
    expect((await put("")).status).toBe(200);
    expect((await db.mentorProfile.findUniqueOrThrow({ where: { id: mentor.id } })).meetingLink).toBeNull();
  });
});

describe("meeting resolution (never claims an external event exists)", () => {
  it("generates an unguessable video-room link by default", () => {
    const a = resolveMeeting({ meetingLink: null });
    const b = resolveMeeting({ meetingLink: null });
    expect(a.kind).toBe("INTERNAL_ROOM");
    expect(a.url).toMatch(/^https:\/\/meet\.jit\.si\/mentio-[0-9a-f]{24}$/);
    expect(a.url).not.toBe(b.url);
    expect(generateRoomUrl()).toMatch(/^https:\/\//);
  });

  it("uses the mentor's own link and labels it external", () => {
    expect(resolveMeeting({ meetingLink: "https://zoom.us/j/1" })).toEqual({ url: "https://zoom.us/j/1", kind: "EXTERNAL_LINK" });
  });

  it("falls back to a generated room if a stored link is no longer acceptable", () => {
    const r = resolveMeeting({ meetingLink: "http://evil.example/phish" });
    expect(r.kind).toBe("INTERNAL_ROOM");
  });
});

describe("token encryption", () => {
  beforeEach(() => vi.stubEnv("TOKEN_ENCRYPTION_KEY", KEY));
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips, never stores plaintext, and uses a fresh IV each time", async () => {
    const { env } = await import("@/lib/env");
    (env as { TOKEN_ENCRYPTION_KEY?: string }).TOKEN_ENCRYPTION_KEY = KEY;
    const a = encryptSecret("super-secret-token");
    expect(a).not.toContain("super-secret-token");
    expect(a).not.toBe(encryptSecret("super-secret-token"));
    expect(decryptSecret(a)).toBe("super-secret-token");
  });

  it("returns null for tampered, truncated or empty values instead of throwing", async () => {
    const { env } = await import("@/lib/env");
    (env as { TOKEN_ENCRYPTION_KEY?: string }).TOKEN_ENCRYPTION_KEY = KEY;
    const good = encryptSecret("token");
    const tampered = good.slice(0, -2) + (good.endsWith("AA") ? "BB" : "AA");
    expect(decryptSecret(tampered)).toBeNull();
    expect(decryptSecret("v1.abc")).toBeNull();
    expect(decryptSecret("garbage")).toBeNull();
    expect(decryptSecret(null)).toBeNull();
  });
});

describe("OAuth state (CSRF)", () => {
  it("only an exact match passes", () => {
    expect(stateMatches("abc123", "abc123")).toBe(true);
    expect(stateMatches("abc123", "abc124")).toBe(false);
    expect(stateMatches("abc", "abc123")).toBe(false);
    expect(stateMatches(null, "abc123")).toBe(false);
    expect(stateMatches("abc123", undefined)).toBe(false);
    expect(stateMatches("", "")).toBe(false);
  });

  it("is refused when the integration is disabled, before anything else happens", async () => {
    const { user } = await createMentor();
    signInAs(user.id);
    const res = await callback(new Request("http://localhost/api/calendars/calendly/callback?code=x&state=y"), {
      params: Promise.resolve({ provider: "calendly" }),
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=unavailable");
    expect(await db.calendarConnection.count()).toBe(0);
  });

  it("an unknown provider segment is rejected, not cast into the database", async () => {
    const { user } = await createMentor();
    signInAs(user.id);
    const res = await callback(new Request("http://localhost/api/calendars/__proto__/callback?code=x"), {
      params: Promise.resolve({ provider: "__proto__" }),
    });
    expect(res.headers.get("location")).toContain("error=unavailable");
  });
});

describe("token expiry handling", () => {
  beforeEach(async () => {
    const { env } = await import("@/lib/env");
    (env as { TOKEN_ENCRYPTION_KEY?: string }).TOKEN_ENCRYPTION_KEY = KEY;
    (env as { CALENDLY_CLIENT_ID?: string }).CALENDLY_CLIENT_ID = "id";
    (env as { CALENDLY_CLIENT_SECRET?: string }).CALENDLY_CLIENT_SECRET = "secret";
  });
  afterEach(() => vi.unstubAllGlobals());

  async function connection(over: { expiresAt: Date | null; refresh?: boolean; access?: string | null }) {
    const { mentor } = await createMentor();
    return db.calendarConnection.create({
      data: {
        mentorProfileId: mentor.id,
        provider: "CALENDLY",
        externalId: "u1",
        accessToken: over.access === null ? null : encryptSecret(over.access ?? "old-access"),
        refreshToken: over.refresh === false ? null : encryptSecret("the-refresh"),
        expiresAt: over.expiresAt,
      },
    });
  }

  it("returns a still-valid token without calling the provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const conn = await connection({ expiresAt: new Date(Date.now() + 3_600_000) });
    expect(await getAccessToken(conn)).toBe("old-access");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes an expired token and stores the new one encrypted", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ access_token: "fresh-access", expires_in: 7200 }), { status: 200 })));
    const conn = await connection({ expiresAt: new Date(Date.now() - 1000) });
    expect(await getAccessToken(conn)).toBe("fresh-access");
    const row = await db.calendarConnection.findUniqueOrThrow({ where: { id: conn.id } });
    expect(row.accessToken).not.toContain("fresh-access");
    expect(decryptSecret(row.accessToken)).toBe("fresh-access");
    expect(row.active).toBe(true);
  });

  it("marks the connection inactive when refresh fails or no refresh token exists", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 400 })));
    const failing = await connection({ expiresAt: new Date(Date.now() - 1000) });
    expect(await getAccessToken(failing)).toBeNull();
    expect((await db.calendarConnection.findUniqueOrThrow({ where: { id: failing.id } })).active).toBe(false);

    const missing = await connection({ expiresAt: new Date(Date.now() - 1000), refresh: false });
    expect(await getAccessToken(missing)).toBeNull();
    expect((await db.calendarConnection.findUniqueOrThrow({ where: { id: missing.id } })).active).toBe(false);
  });

  it("treats a token that can't be decrypted as missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 400 })));
    const conn = await connection({ expiresAt: null, access: null, refresh: false });
    expect(await getAccessToken(conn)).toBeNull();
  });
});

describe("disconnect", () => {
  const post = (provider: string) =>
    disconnect(new Request(`http://localhost/api/calendars/${provider}/disconnect`, { method: "POST" }), { params: Promise.resolve({ provider }) });

  it("removes the stored connection (and its tokens) for the signed-in mentor only", async () => {
    const mine = await createMentor();
    const theirs = await createMentor();
    for (const m of [mine, theirs]) {
      await db.calendarConnection.create({ data: { mentorProfileId: m.mentor.id, provider: "CAL_COM", externalId: "x", accessToken: "enc" } });
    }
    signInAs(mine.user.id);
    const res = await post("cal-com");
    expect(res.status).toBe(303);
    expect(await db.calendarConnection.count({ where: { mentorProfileId: mine.mentor.id } })).toBe(0);
    expect(await db.calendarConnection.count({ where: { mentorProfileId: theirs.mentor.id } })).toBe(1);
  });

  it("ignores bogus providers without a database error, and refuses non-mentors", async () => {
    const { user, mentor } = await createMentor();
    await db.calendarConnection.create({ data: { mentorProfileId: mentor.id, provider: "CALENDLY", externalId: "x" } });
    signInAs(user.id);
    expect((await post("nonsense")).status).toBe(303);
    expect(await db.calendarConnection.count()).toBe(1);

    signInAs((await createUser()).id);
    await post("calendly");
    expect(await db.calendarConnection.count()).toBe(1);
  });
});
