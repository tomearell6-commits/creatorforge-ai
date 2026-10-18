/**
 * Internal links for auto-posted articles. The writer is asked to link to the site's own pages, but
 * it sometimes skips it. This guarantees a minimum: when an article has too few links to the site
 * itself, a short "Related reading" list of the most relevant real pages is added.
 */
export type LinkCandidate = { url: string; title: string };

const STOP = new Set(["the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "with", "is", "are", "what", "how", "why", "your", "you", "from", "that", "this", "into", "buy", "guide", "australia", "australian"]);
// Pages that make poor "related reading": legal, account and contact pages.
const SKIP_PATH = /(privacy|terms|cookie|refund|returns|login|account|cart|checkout|contact|thank|sitemap|wp-)/i;

const words = (s: string): Set<string> =>
  new Set(s.toLowerCase().replace(/&[a-z#0-9]+;/g, " ").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));

const norm = (u: string) => u.replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();

export function countInternalLinks(html: string, siteUrl: string): number {
  let host = "";
  try { host = new URL(siteUrl).hostname.replace(/^www\./, ""); } catch { return 0; }
  let n = 0;
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)) {
    try { if (new URL(m[1], siteUrl).hostname.replace(/^www\./, "") === host && !m[1].startsWith("#")) n++; } catch { /* ignore */ }
  }
  return n;
}

export function ensureInternalLinks(
  html: string,
  candidates: LinkCandidate[],
  opts: { siteUrl: string; keyword: string; title: string; minLinks?: number; maxAdded?: number },
): { html: string; added: number } {
  const min = opts.minLinks ?? 2;
  const have = countInternalLinks(html, opts.siteUrl);
  if (have >= min) return { html, added: 0 };

  const target = words(`${opts.keyword} ${opts.title}`);
  const used = new Set([...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => norm(m[1])));
  const home = norm(opts.siteUrl);

  const ranked = candidates
    .filter((c) => c.url && c.title && norm(c.url) !== home && !used.has(norm(c.url)))
    .filter((c) => { try { return !SKIP_PATH.test(new URL(c.url).pathname); } catch { return false; } })
    .map((c) => {
      const w = words(c.title);
      let hit = 0;
      for (const x of w) if (target.has(x)) hit++;
      return { c, score: hit / Math.sqrt(Math.max(1, w.size)) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const take = ranked.slice(0, Math.min(opts.maxAdded ?? 4, Math.max(min - have, 3)));
  if (take.length === 0) return { html, added: 0 };

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const list = take.map(({ c }) => `<li><a href="${esc(c.url)}">${esc(c.title)}</a></li>`).join("");
  return { html: `${html}\n<h2>Related reading</h2>\n<ul>${list}</ul>`, added: take.length };
}
