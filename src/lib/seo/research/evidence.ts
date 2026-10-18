/**
 * Pure helpers for turning raw web evidence (a site's pages, search results, competitor
 * pages) into the compact facts the AI strategist needs. No network or AI in this file,
 * so it is fully unit-testable.
 */
import type { SerpHit } from "./firecrawl";

/** Hosts that rank in search results but are not businesses to learn from or compete with. */
const NON_COMPETITOR = [
  "wikipedia.org", "youtube.com", "youtu.be", "reddit.com", "quora.com", "facebook.com", "instagram.com",
  "linkedin.com", "pinterest.com", "twitter.com", "x.com", "tiktok.com", "medium.com", "google.com",
  "amazon.com", "amazon.co.uk", "ebay.com", "etsy.com", "yelp.com", "tripadvisor.com", "alibaba.com",
  "aliexpress.com", "walmart.com", "pdfdrive.com", "scribd.com", "github.com", "apple.com",
];

export function hostOf(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

export function isCompetitorHost(host: string): boolean {
  return !!host && !NON_COMPETITOR.some((h) => host === h || host.endsWith(`.${h}`));
}

/** Strip images and link targets so page text is compact enough to send to the AI. */
export function cleanMarkdown(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractHeadings(md: string, level: 2 | 3 = 2): string[] {
  const re = level === 2 ? /^##\s+(.+)$/gm : /^###\s+(.+)$/gm;
  return [...md.matchAll(re)]
    .map((m) => m[1].replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`#]/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function wordCountOf(md: string): number {
  return cleanMarkdown(md).split(/\s+/).filter(Boolean).length;
}

const PAGE_HINT = /(about|service|product|shop|store|solution|pricing|price|collection|categor|catalog|treatment|menu|offer)/i;
const SKIP_PATH = /\.(pdf|jpg|jpeg|png|gif|webp|svg|zip|xml|css|js)$|(cart|checkout|login|account|privacy|terms|cookie|wp-admin|wp-json|feed|tag|author)/i;

/** A few internal pages worth reading to understand what the business sells. */
export function pickInternalPages(origin: string, links: string[], max = 3): string[] {
  let base: URL;
  try { base = new URL(origin); } catch { return []; }
  const seen = new Set<string>([base.origin + "/"]);
  const out: string[] = [];
  for (const l of links) {
    let u: URL;
    try { u = new URL(l, base); } catch { continue; }
    if (u.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
    const key = u.origin + u.pathname.replace(/\/+$/, "") + "/";
    if (seen.has(key) || SKIP_PATH.test(u.pathname) || u.pathname === "/" || u.pathname.split("/").filter(Boolean).length > 2) continue;
    if (!PAGE_HINT.test(u.pathname)) continue;
    seen.add(key);
    out.push(u.origin + u.pathname);
    if (out.length >= max) break;
  }
  return out;
}

export type SerpForKeyword = { keyword: string; hits: SerpHit[] };
export type CompetitorSummary = { domain: string; appearances: number; bestRank: number; keywords: string[]; topPage: string };

/** Who keeps showing up for the brand's keywords (excluding the brand itself). */
export function summarizeCompetitors(serp: SerpForKeyword[], ownHost: string, max = 6): CompetitorSummary[] {
  const map = new Map<string, CompetitorSummary>();
  for (const { keyword, hits } of serp) {
    hits.forEach((h, i) => {
      const d = hostOf(h.url);
      if (!d || d === ownHost || !isCompetitorHost(d)) return;
      const rank = i + 1;
      const cur = map.get(d) ?? { domain: d, appearances: 0, bestRank: rank, keywords: [], topPage: h.url };
      cur.appearances += 1;
      if (rank < cur.bestRank) { cur.bestRank = rank; cur.topPage = h.url; }
      if (!cur.keywords.includes(keyword)) cur.keywords.push(keyword);
      map.set(d, cur);
    });
  }
  return [...map.values()]
    .sort((a, b) => b.appearances - a.appearances || a.bestRank - b.bestRank)
    .slice(0, max);
}

/** The best-ranking page for each of the top competing domains — the pages worth studying. */
export function pickPagesToStudy(serp: SerpForKeyword[], ownHost: string, max = 6): { url: string; keyword: string; rank: number }[] {
  const best = new Map<string, { url: string; keyword: string; rank: number }>();
  for (const { keyword, hits } of serp) {
    hits.forEach((h, i) => {
      const d = hostOf(h.url);
      if (!d || d === ownHost) return;
      const rank = i + 1;
      const cur = best.get(d);
      if (!cur || rank < cur.rank) best.set(d, { url: h.url, keyword, rank });
    });
  }
  return [...best.values()].sort((a, b) => a.rank - b.rank).slice(0, max);
}
