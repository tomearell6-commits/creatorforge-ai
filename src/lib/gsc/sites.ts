import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArticleRef } from "./overview";

/** The websites a user publishes to with SEO Autopilot, and the articles it published on each. */
export type SiteEntry = { host: string; name: string; url: string; kind: "wordpress" | "blog" };

const hostOf = (u: string) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ""; } };
const BLOG_URL = "https://www.creatorsforge.io/blog";

export async function listSites(supabase: SupabaseClient, isAdmin: boolean): Promise<SiteEntry[]> {
  const { data: rows } = await supabase.from("seo_autopost_sites").select("destination, wordpress_site_id");
  const wpIds = (rows ?? []).map((r) => r.wordpress_site_id as string | null).filter((x): x is string => !!x);
  const { data: wps } = wpIds.length ? await supabase.from("wordpress_sites").select("id, site_name, site_url").in("id", wpIds) : { data: [] };
  const out: SiteEntry[] = [];
  const seen = new Set<string>();
  for (const w of wps ?? []) {
    const host = hostOf(w.site_url as string);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    out.push({ host, name: (w.site_name as string) || host, url: w.site_url as string, kind: "wordpress" });
  }
  if (isAdmin && (rows ?? []).some((r) => r.destination === "creatorforge_blog")) {
    out.push({ host: hostOf(BLOG_URL), name: "CreatorsForge blog", url: BLOG_URL, kind: "blog" });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Published Autopilot articles for one host, newest first. */
export async function articlesFor(supabase: SupabaseClient, admin: SupabaseClient, site: SiteEntry): Promise<ArticleRef[]> {
  if (site.kind === "blog") {
    const { data } = await admin.from("blog_posts").select("title, slug, published_at").eq("status", "published").order("published_at", { ascending: false }).limit(100);
    return (data ?? []).map((p) => ({ title: p.title as string, url: `https://www.creatorsforge.io/blog/${p.slug}`, publishedAt: (p.published_at as string) ?? null }));
  }
  const { data: wps } = await supabase.from("wordpress_sites").select("id, site_url");
  const ids = (wps ?? []).filter((w) => hostOf(w.site_url as string) === site.host).map((w) => w.id as string);
  if (!ids.length) return [];
  const { data: auto } = await supabase.from("seo_autopost_sites").select("id").in("wordpress_site_id", ids);
  const autoIds = (auto ?? []).map((a) => a.id as string);
  if (!autoIds.length) return [];
  const { data: logs } = await supabase.from("seo_autopost_log").select("title, post_url, created_at")
    .in("site_id", autoIds).eq("status", "published").not("post_url", "is", null).order("created_at", { ascending: false }).limit(100);
  return (logs ?? []).map((l) => ({ title: (l.title as string) || (l.post_url as string), url: l.post_url as string, publishedAt: l.created_at as string }));
}
