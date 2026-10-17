/**
 * SEO Auto-Poster scheduling — pure functions (no I/O) so they are easy to test.
 *
 * Users never choose a date or time. When a site is added we assign publish hours
 * (UTC, spread across the daytime so sites don't all fire at once). An hourly cron
 * asks "is this site due?": it is due when more of today's slots have passed than
 * posts have been published today — so a missed or failed slot is caught up on the
 * next hour automatically.
 */

/** Stable 32-bit hash so the same site always gets the same hours. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Choose publish hours (UTC): 1/day → one mid-day slot; 2/day → morning + afternoon. */
export function assignPublishHours(postsPerDay: number, seed: string): number[] {
  const h = hash(seed);
  if (postsPerDay >= 2) {
    const first = 6 + (h % 5);           // 06–10 UTC
    return [first, first + 8];            // 14–18 UTC
  }
  return [8 + (h % 9)];                   // 08–16 UTC
}

export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** How many of today's slots have already come due at this UTC hour. */
export function slotsDue(hours: number[], nowUtcHour: number): number {
  return hours.filter((h) => h <= nowUtcHour).length;
}

/** A site is due when fewer posts were published today than slots have passed. */
export function isSiteDue(args: { hours: number[]; publishedToday: number; now: Date }): boolean {
  return args.publishedToday < slotsDue(args.hours, args.now.getUTCHours());
}
