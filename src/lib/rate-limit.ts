// Simple in-memory rate limiter (per-process). For production scale,
// swap for an Upstash Ratelimit or Redis-backed implementation —
// the Limiter interface below is designed to be a drop-in.

type Entry = { count: number; resetAt: number };
const bucket = new Map<string, Entry>();

export interface Limiter {
  check(key: string): Promise<{ ok: boolean; remaining: number; reset: number }>;
}

export function createLimiter(opts: { limit: number; windowMs: number }): Limiter {
  return {
    async check(key) {
      const now = Date.now();
      const entry = bucket.get(key);
      if (!entry || entry.resetAt < now) {
        const resetAt = now + opts.windowMs;
        bucket.set(key, { count: 1, resetAt });
        return { ok: true, remaining: opts.limit - 1, reset: resetAt };
      }
      if (entry.count >= opts.limit) {
        return { ok: false, remaining: 0, reset: entry.resetAt };
      }
      entry.count += 1;
      return { ok: true, remaining: opts.limit - entry.count, reset: entry.resetAt };
    },
  };
}

export const authLimiter = createLimiter({ limit: 10, windowMs: 10 * 60_000 });
export const apiLimiter = createLimiter({ limit: 100, windowMs: 60_000 });
