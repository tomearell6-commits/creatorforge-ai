/**
 * Per-identity rate limiting (Phase 8 — Module 3, GA).
 *
 * Distributed via Upstash Redis when UPSTASH_REDIS_REST_URL + _TOKEN are set
 * (correct across multiple serverless instances); otherwise falls back to an
 * in-memory token bucket (single instance / dev). Fails open on internal error.
 */
import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export function rateLimitEnabledDistributed(): boolean {
  return !!redis;
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * @returns ok=false when the limit is exceeded (send HTTP 429).
 */
export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number } = { limit: 30, windowMs: 60_000 }
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterSec: 0 };
  }
  if (b.count >= opts.limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true, remaining: opts.limit - b.count, retryAfterSec: 0 };
}

/** Convenience: rate-limit a request by IP + a route label (in-memory). */
export function limitRequest(req: Request, label: string, limit = 30, windowMs = 60_000) {
  return rateLimit(`${label}:${clientIp(req)}`, { limit, windowMs });
}

/**
 * Distributed (Redis) fixed-window limiter; falls back to in-memory when Redis
 * isn't configured. Use this in routes (await it). Fails open on Redis error.
 */
export async function rateLimitAsync(
  key: string,
  opts: { limit: number; windowMs: number } = { limit: 30, windowMs: 60_000 }
): Promise<{ ok: boolean; remaining: number; retryAfterSec: number }> {
  if (!redis) return rateLimit(key, opts);
  try {
    const k = `rl:${key}`;
    const count = await redis.incr(k);
    if (count === 1) await redis.pexpire(k, opts.windowMs);
    if (count > opts.limit) {
      const ttl = await redis.pttl(k);
      return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((ttl || opts.windowMs) / 1000)) };
    }
    return { ok: true, remaining: opts.limit - count, retryAfterSec: 0 };
  } catch {
    return rateLimit(key, opts); // fail open to in-memory
  }
}

/** Async convenience: distributed rate-limit a request by IP + label. */
export async function limitRequestAsync(req: Request, label: string, limit = 30, windowMs = 60_000) {
  return rateLimitAsync(`${label}:${clientIp(req)}`, { limit, windowMs });
}

// Opportunistic cleanup so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}, 5 * 60_000).unref?.();
