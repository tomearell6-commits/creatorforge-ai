/**
 * Which WordPress category an auto-posted article goes into, so posts never land in "Uncategorized".
 * Priority: the category the owner set on the site → a sensible one from the writer → a fallback by search intent.
 */
const GENERIC = new Set(["blog", "uncategorized", "uncategorised", "article", "articles", "general", "post", "posts", "news", "other", "misc", "default"]);

export function cleanCategory(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const c = v.replace(/<[^>]*>/g, "").replace(/[^\p{L}\p{N}\s&'-]/gu, " ").replace(/\s+/g, " ").trim();
  if (c.length < 3 || c.length > 40 || c.split(" ").length > 4) return null;
  if (GENERIC.has(c.toLowerCase())) return null;
  return c.replace(/\b\p{L}/gu, (m) => m.toUpperCase());
}

export function chooseCategory(opts: { siteDefault?: string | null; fromWriter?: unknown; intent?: string | null }): string {
  const own = cleanCategory(opts.siteDefault);
  if (own) return own;
  const written = cleanCategory(opts.fromWriter);
  if (written) return written;
  const i = (opts.intent ?? "").toLowerCase();
  return /transaction|commercial|buy|compar/.test(i) ? "Buying Guides" : "Guides";
}
