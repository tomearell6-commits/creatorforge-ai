/**
 * WordPress SEO Auto-Fix engine (SERVER-ONLY).
 *
 * Review-and-approve model: audit a connected WordPress site → propose AI-written
 * meta title / meta description fixes → the user approves → apply them to the
 * live site via the WordPress REST API. Reuses the connection + auth + meta
 * pattern from lib/seo/publish.ts, and the page inspection from lib/browser.
 *
 * v1 scope: meta title + meta description only (the highest-value, safest,
 * fully-automatable fixes). Alt text / H1 edits are detected but left for a
 * later version (they need vision / content rewriting and more review).
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { normalizeSite } from "@/lib/publishing/providers/wordpress";
import { fetchWithTimeout } from "@/lib/http";
import { inspectUrl } from "@/lib/browser/inspect";

const UA = "Mozilla/5.0 (compatible; CreatorsForgeSEOFixer/1.0; +https://www.creatorsforge.io)";
const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export type WpItem = { id: number; type: "post" | "page"; title: string; link: string };
export type ProposedFix = {
  postId: number; postType: "post" | "page"; url: string; title: string;
  currentMetaTitle: string | null; currentMetaDescription: string | null;
  newMetaTitle: string | null; newMetaDescription: string | null;
  reasons: string[];
};

function basicAuth(username: string, appPassword: string) {
  return `Basic ${Buffer.from(`${username}:${appPassword.replace(/\s+/g, "")}`).toString("base64")}`;
}

/** List recent posts + pages from a connected site. */
export async function fetchWpItems(siteUrl: string, auth: string, perType = 10): Promise<WpItem[]> {
  const site = normalizeSite(siteUrl);
  const items: WpItem[] = [];
  for (const type of ["posts", "pages"] as const) {
    try {
      const res = await fetchWithTimeout(
        `${site}/wp-json/wp/v2/${type}?per_page=${perType}&status=publish&_fields=id,link,title`,
        { headers: { Authorization: auth, "User-Agent": UA } }, 15_000
      );
      if (!res.ok) continue;
      const list = await res.json();
      for (const p of Array.isArray(list) ? list : []) {
        items.push({ id: p.id, type: type === "posts" ? "post" : "page", title: p.title?.rendered ?? "", link: p.link });
      }
    } catch { /* best-effort per type */ }
  }
  return items;
}

function willUseRealAI() { return !!process.env.ANTHROPIC_API_KEY; }

/** Ask Claude for a strong meta title + description for a page. Falls back to
 *  a deterministic draft when no API key. */
async function generateMeta(title: string, currentDesc: string | null, snippetText: string): Promise<{ metaTitle: string; metaDescription: string }> {
  if (!willUseRealAI()) {
    const t = title.slice(0, 60);
    return { metaTitle: t, metaDescription: (currentDesc || `${title}. Learn more and get started today.`).slice(0, 158) };
  }
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 300,
      system: "You are an SEO copywriter. Return ONLY compact JSON: {\"metaTitle\":\"…\",\"metaDescription\":\"…\"}. metaTitle ≤60 chars, metaDescription 140–160 chars, compelling, accurate to the page, no quotes inside values.",
      messages: [{ role: "user", content: `Page title: ${title}\nCurrent description: ${currentDesc ?? "(none)"}\nPage summary: ${snippetText.slice(0, 600)}` }],
    });
    const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return {
      metaTitle: String(parsed.metaTitle || title).slice(0, 65),
      metaDescription: String(parsed.metaDescription || "").slice(0, 165),
    };
  } catch {
    const t = title.slice(0, 60);
    return { metaTitle: t, metaDescription: (currentDesc || `${title}. Learn more and get started today.`).slice(0, 158) };
  }
}

/** Inspect each item's live URL and propose meta fixes where they're missing or
 *  poorly sized. Only returns items that actually need a fix. */
export async function proposeFixes(siteUrl: string, auth: string, limit = 8): Promise<ProposedFix[]> {
  const items = (await fetchWpItems(siteUrl, auth)).slice(0, limit);
  const out: ProposedFix[] = [];
  for (const it of items) {
    const report = await inspectUrl(it.link);
    if (!report.ok) continue;
    const reasons: string[] = [];
    const titleBad = !report.meta.title || report.meta.titleLength < 30 || report.meta.titleLength > 65;
    const descBad = !report.meta.metaDescription || report.meta.metaDescriptionLength < 70 || report.meta.metaDescriptionLength > 165;
    if (!titleBad && !descBad) continue;
    if (titleBad) reasons.push(report.meta.title ? `Title length ${report.meta.titleLength} (aim 30–65)` : "Missing title");
    if (descBad) reasons.push(report.meta.metaDescription ? `Description length ${report.meta.metaDescriptionLength} (aim 120–160)` : "Missing meta description");

    const gen = await generateMeta(report.meta.title || it.title, report.meta.metaDescription, report.snippet.description);
    out.push({
      postId: it.id, postType: it.type, url: it.link, title: report.meta.title || it.title,
      currentMetaTitle: report.meta.title, currentMetaDescription: report.meta.metaDescription,
      newMetaTitle: titleBad ? gen.metaTitle : null,
      newMetaDescription: descBad ? gen.metaDescription : null,
      reasons,
    });
  }
  return out;
}

const HELPER_HINT = "Change didn't take effect — your SEO plugin (Rank Math/Yoast) blocks REST meta writes. Install the free CreatorsForge SEO helper plugin (WordPress SEO Fixer → setup) and retry.";

/** Apply a meta fix to one post/page via the WP REST API (Yoast + Rank Math),
 *  then VERIFY the change actually landed before reporting success. WordPress
 *  returns 200 even when it silently ignores unregistered meta keys, so we
 *  re-read the meta and confirm — the caller charges only on a verified ok. */
export async function applyMetaFix(
  siteUrl: string, auth: string,
  fix: { postId: number; postType: "post" | "page"; metaTitle?: string | null; metaDescription?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const site = normalizeSite(siteUrl);
  const endpoint = fix.postType === "page" ? "pages" : "posts";
  const meta: Record<string, string> = {};
  if (fix.metaTitle) { meta._yoast_wpseo_title = fix.metaTitle; meta.rank_math_title = fix.metaTitle; }
  if (fix.metaDescription) { meta._yoast_wpseo_metadesc = fix.metaDescription; meta.rank_math_description = fix.metaDescription; }

  try {
    const res = await fetchWithTimeout(
      `${site}/wp-json/wp/v2/${endpoint}/${fix.postId}`,
      { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json", "User-Agent": UA }, body: JSON.stringify({ meta }) },
      20_000
    );
    if (!res.ok) return { ok: false, error: `WordPress error ${res.status}: ${(await res.text()).slice(0, 150)}` };

    // Verify: re-read the meta and confirm the new value is actually stored.
    const check = await fetchWithTimeout(
      `${site}/wp-json/wp/v2/${endpoint}/${fix.postId}?_fields=meta`,
      { headers: { Authorization: auth, "User-Agent": UA } }, 15_000
    );
    if (!check.ok) return { ok: false, error: HELPER_HINT };
    const m = ((await check.json())?.meta ?? {}) as Record<string, string>;
    const titleOk = !fix.metaTitle || m.rank_math_title === fix.metaTitle || m._yoast_wpseo_title === fix.metaTitle;
    const descOk = !fix.metaDescription || m.rank_math_description === fix.metaDescription || m._yoast_wpseo_metadesc === fix.metaDescription;
    if (titleOk && descOk) return { ok: true };
    return { ok: false, error: HELPER_HINT };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "apply failed" };
  }
}

export { basicAuth };
