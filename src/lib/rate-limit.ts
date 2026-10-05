// Fixed-window rate limiter backed by Postgres.
//
// Serverless instances share no memory, so an in-process Map would give every
// cold start a fresh budget. One atomic INSERT .. ON CONFLICT per check keeps
// the counter correct across all instances with no extra infrastructure. The
// window is measured with the database clock, so instances can't disagree.
//
// If the check itself fails (DB down, table missing) it THROWS: callers must
// treat that as "limited" rather than silently allowing unlimited attempts.
import { db } from "@/lib/db";

export type LimitResult = { ok: boolean; remaining: number; reset: number };

export interface Limiter {
  check(key: string): Promise<LimitResult>;
}

export function createLimiter(opts: { name: string; limit: number; windowMs: number }): Limiter {
  return {
    async check(key) {
      const bucket = `${opts.name}:${key}`;
      const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
        INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
        VALUES (${bucket}, 1, now() + (${opts.windowMs}::int * interval '1 millisecond'))
        ON CONFLICT ("key") DO UPDATE SET
          "count"   = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
          "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= now()
                           THEN now() + (${opts.windowMs}::int * interval '1 millisecond')
                           ELSE "RateLimitBucket"."resetAt" END
        RETURNING "count"::int AS "count", "resetAt"`;
      const { count, resetAt } = rows[0];

      // Opportunistic cleanup so the table stays small without a cron job.
      if (Math.random() < 0.01) {
        void db.rateLimitBucket
          .deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 60 * 60_000) } } })
          .catch(() => undefined);
      }

      return {
        ok: count <= opts.limit,
        remaining: Math.max(0, opts.limit - count),
        reset: resetAt.getTime(),
      };
    },
  };
}

export const limiters = {
  signIn: createLimiter({ name: "signin", limit: 10, windowMs: 10 * 60_000 }),
  signInIp: createLimiter({ name: "signin-ip", limit: 30, windowMs: 10 * 60_000 }),
  signUp: createLimiter({ name: "signup", limit: 5, windowMs: 60 * 60_000 }),
  forgot: createLimiter({ name: "forgot", limit: 3, windowMs: 60 * 60_000 }),
  forgotIp: createLimiter({ name: "forgot-ip", limit: 10, windowMs: 60 * 60_000 }),
  reset: createLimiter({ name: "reset", limit: 10, windowMs: 60 * 60_000 }),
  verify: createLimiter({ name: "verify", limit: 20, windowMs: 60 * 60_000 }),
  booking: createLimiter({ name: "booking", limit: 10, windowMs: 10 * 60_000 }),
  api: createLimiter({ name: "api", limit: 120, windowMs: 60_000 }),
};

/** Best-effort client IP. Behind Vercel/most proxies the first hop is set by the platform. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip") || "unknown";
}

/** Run several limiters; returns true only if all allow the request. Fails closed. */
export async function allowed(checks: Promise<LimitResult>[]): Promise<boolean> {
  try {
    const results = await Promise.all(checks);
    return results.every((r) => r.ok);
  } catch (err) {
    console.error("rate limiter unavailable, denying request", err instanceof Error ? err.message : err);
    return false;
  }
}
