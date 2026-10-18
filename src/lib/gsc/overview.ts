/**
 * Pure helpers for the SEO Results dashboard: no network, easy to test.
 *  - which Search Console property belongs to a website
 *  - the date windows (Search Console data lags about two days)
 *  - turning API rows into totals, a daily series and per-article results
 */

export type GscProperty = { siteUrl: string; permissionLevel?: string };
export type GscRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };
export type Totals = { clicks: number; impressions: number; ctr: number; position: number };

const strip = (h: string) => h.toLowerCase().replace(/^www\./, "");

/** The Search Console property that covers `host`, or null. Domain properties cover subdomains. */
export function pickProperty(props: GscProperty[], host: string): string | null {
  const apex = strip(host);
  let best: { url: string; rank: number } | null = null;
  for (const p of props) {
    if (!p.siteUrl || p.permissionLevel === "siteUnverifiedUser") continue;
    let rank = 0;
    if (p.siteUrl.startsWith("sc-domain:")) {
      const d = strip(p.siteUrl.slice("sc-domain:".length));
      if (apex === d || apex.endsWith(`.${d}`)) rank = 2;
    } else {
      try {
        const u = new URL(p.siteUrl);
        const h = u.hostname.toLowerCase();
        if (strip(h) !== apex) continue;
        if (u.pathname !== "/" && u.pathname !== "") continue; // a sub-folder property covers only part of the site
        rank = u.protocol === "https:" ? (h === host.toLowerCase() ? 1 : 3) : 4;
      } catch { continue; }
    }
    if (rank && (!best || rank < best.rank)) best = { url: p.siteUrl, rank };
  }
  return best ? best.url : null;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Search Console reports up to about two days ago. `days` is the window length. */
export function dateRange(days: number, now: Date = new Date()) {
  const n = Math.min(90, Math.max(7, Math.round(days)));
  const end = addDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), -2);
  const start = addDays(end, -(n - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(n - 1));
  return { days: n, start: ymd(start), end: ymd(end), prevStart: ymd(prevStart), prevEnd: ymd(prevEnd) };
}

export function totalsFrom(rows: GscRow[] | undefined): Totals {
  const r = rows?.[0];
  return { clicks: r?.clicks ?? 0, impressions: r?.impressions ?? 0, ctr: r?.ctr ?? 0, position: r?.position ?? 0 };
}

/** Every day in the window, zero-filled, so the chart has no gaps. */
export function dailySeries(rows: GscRow[] | undefined, start: string, end: string) {
  const byDate = new Map<string, GscRow>();
  for (const r of rows ?? []) if (r.keys?.[0]) byDate.set(r.keys[0], r);
  const out: { date: string; clicks: number; impressions: number }[] = [];
  for (let d = new Date(`${start}T00:00:00Z`); ymd(d) <= end; d = addDays(d, 1)) {
    const r = byDate.get(ymd(d));
    out.push({ date: ymd(d), clicks: r?.clicks ?? 0, impressions: r?.impressions ?? 0 });
  }
  return out;
}

/** Same page, however it is written: host case, www, trailing slash, query and fragment ignored. */
export function pageKey(url: string): string {
  try {
    const u = new URL(url);
    return `${strip(u.hostname)}${u.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\/+$/, "");
  }
}

export type ArticleRef = { title: string; url: string; publishedAt: string | null };
export type ArticleResult = ArticleRef & { clicks: number; impressions: number; position: number | null; daysLive: number | null };

/** Each Autopilot article with what Google reports for its page (zeros when it has no impressions yet). */
export function articleResults(articles: ArticleRef[], pageRows: GscRow[] | undefined, now: Date = new Date()): ArticleResult[] {
  const byPage = new Map<string, GscRow>();
  for (const r of pageRows ?? []) if (r.keys?.[0]) byPage.set(pageKey(r.keys[0]), r);
  return articles.map((a) => {
    const r = byPage.get(pageKey(a.url));
    const days = a.publishedAt ? Math.max(0, Math.floor((now.getTime() - new Date(a.publishedAt).getTime()) / 86_400_000)) : null;
    return {
      ...a, clicks: r?.clicks ?? 0, impressions: r?.impressions ?? 0,
      position: r && r.impressions ? Math.round((r.position ?? 0) * 10) / 10 : null, daysLive: days,
    };
  });
}

/** Percentage change, or null when the earlier value is zero (a change from nothing is not a percentage). */
export function pctChange(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}
