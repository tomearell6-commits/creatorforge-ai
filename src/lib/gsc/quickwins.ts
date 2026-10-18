/**
 * "Quick wins": pages Google already shows that could earn more clicks. Pure functions, no network.
 *
 * Two kinds, both from Google's own numbers:
 *  - low_ctr    page 1 (position 10 or better), seen at least 20 times, but clicked far less often than
 *               is typical for that position -> the title and description are the lever
 *  - striking   position 11-20 (page 2), seen at least 20 times -> close to page 1; a sharper title,
 *               fuller coverage and more internal links are the levers
 * Typical click rates are rough industry averages by position, used only to rank opportunities.
 */
import { pageKey, type GscRow } from "./overview";

export type QueryStat = { query: string; clicks: number; impressions: number; position: number };
export type Win = {
  url: string; kind: "low_ctr" | "striking";
  clicks: number; impressions: number; ctr: number; position: number;
  expectedCtr: number; potentialClicks: number; queries: QueryStat[];
};

/** Rough average click-through rate for an organic result at this position. */
export function benchmarkCtr(position: number): number {
  const p = Math.round(position);
  const table = [0.28, 0.15, 0.1, 0.07, 0.05, 0.04, 0.03, 0.025, 0.02, 0.018];
  if (p < 1) return table[0];
  if (p <= 10) return table[p - 1];
  if (p <= 15) return 0.012;
  if (p <= 20) return 0.008;
  return 0.004;
}

const MIN_IMPRESSIONS = 20;

export function findQuickWins(pageRows: GscRow[] | undefined, pageQueryRows: GscRow[] | undefined, limit = 8): Win[] {
  const byPage = new Map<string, QueryStat[]>();
  for (const r of pageQueryRows ?? []) {
    const [page, query] = r.keys ?? [];
    if (!page || !query) continue;
    const k = pageKey(page);
    const list = byPage.get(k) ?? [];
    list.push({ query, clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, position: Math.round((r.position ?? 0) * 10) / 10 });
    byPage.set(k, list);
  }

  const wins: Win[] = [];
  for (const r of pageRows ?? []) {
    const url = r.keys?.[0];
    const impressions = r.impressions ?? 0;
    const position = r.position ?? 0;
    const clicks = r.clicks ?? 0;
    if (!url || impressions < MIN_IMPRESSIONS || position <= 0) continue;
    const ctr = r.ctr ?? (impressions ? clicks / impressions : 0);
    const expectedCtr = benchmarkCtr(position);

    let kind: Win["kind"] | null = null;
    let potential = 0;
    if (position <= 10 && ctr < expectedCtr * 0.6) { kind = "low_ctr"; potential = impressions * (expectedCtr - ctr); }
    else if (position > 10 && position <= 20) { kind = "striking"; potential = impressions * Math.max(0, benchmarkCtr(8) - ctr) * 0.5; }
    if (!kind || potential < 0.5) continue;

    const queries = (byPage.get(pageKey(url)) ?? []).sort((a, b) => b.impressions - a.impressions).slice(0, 5);
    wins.push({
      url, kind, clicks, impressions, ctr, position: Math.round(position * 10) / 10,
      expectedCtr, potentialClicks: Math.round(potential * 10) / 10, queries,
    });
  }
  return wins.sort((a, b) => b.potentialClicks - a.potentialClicks).slice(0, limit);
}
