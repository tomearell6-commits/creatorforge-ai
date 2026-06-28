/**
 * Lightweight per-identity rate limiting (Phase 8 — Module 3).
 *
 * In-memory token bucket keyed by IP+route. Suitable for a single instance /
 * abuse-dampening; for multi-instance scale, back this with Redis/Upstash (the
 * `check` signature stays the same). Fails open on internal error.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

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

/** Convenience: rate-limit a request by IP + a route label. */
export function limitRequest(req: Request, label: string, limit = 30, windowMs = 60_000) {
  return rateLimit(`${label}:${clientIp(req)}`, { limit, windowMs });
}

// Opportunistic cleanup so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}, 5 * 60_000).unref?.();
