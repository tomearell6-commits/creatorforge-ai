/**
 * Minimal Firecrawl client for the SEO research engine: read a page, and search the web
 * (real search-engine results = what actually ranks). Server-only. Returns null/[] on any
 * failure so one bad page never sinks a whole analysis.
 */
import { fetchWithTimeout } from "@/lib/http";

const BASE = "https://api.firecrawl.dev/v1";

export function hasFirecrawl(): boolean {
  return !!process.env.FIRECRAWL_API_KEY;
}

async function post(path: string, body: unknown, ms: number): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchWithTimeout(
      `${BASE}${path}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      ms
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type Scraped = { url: string; title: string; description: string; markdown: string; links: string[] };

/**
 * Read one public page as markdown (+ its links). `full` also keeps the navigation and
 * footer, which is what you want on a homepage to discover the site's key pages.
 */
export async function fcScrape(url: string, opts: { full?: boolean } = {}): Promise<Scraped | null> {
  const j = await post("/scrape", { url, formats: ["markdown", "links"], onlyMainContent: !opts.full }, 45_000);
  const d = j?.data as { markdown?: string; links?: string[]; metadata?: { title?: string; description?: string } } | undefined;
  if (!d || !d.markdown) return null;
  return {
    url,
    title: d.metadata?.title ?? "",
    description: d.metadata?.description ?? "",
    markdown: d.markdown,
    links: Array.isArray(d.links) ? d.links : [],
  };
}

export type SerpHit = { url: string; title: string; description: string };

/** Real web-search results for a query, in ranking order. */
export async function fcSearch(query: string, opts: { limit?: number; country?: string } = {}): Promise<SerpHit[]> {
  const body: Record<string, unknown> = { query, limit: opts.limit ?? 8 };
  if (opts.country) body.country = opts.country;
  const j = await post("/search", body, 45_000);
  const data = (j?.data as { url?: string; title?: string; description?: string }[] | undefined) ?? [];
  return data
    .filter((r) => r.url)
    .map((r) => ({ url: r.url as string, title: r.title ?? "", description: r.description ?? "" }));
}
