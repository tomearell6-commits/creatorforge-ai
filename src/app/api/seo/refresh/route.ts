import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { cacheGet, type Inspection } from "@/lib/gsc/google";
import { refreshPriority, wordCount } from "@/lib/blog/refresh-rank";

/**
 * GET /api/seo/refresh -> the CreatorsForge blog's published posts, with the ones most worth refreshing first
 * and the reason why. Search numbers and indexing answers come from the last time they were fetched
 * on the SEO Results page (nothing new is asked of Google here). Platform owner only.
 */
const HOST = "www.creatorsforge.io";
const MONTH = 30 * 24 * 60 * 60_000;

type Row = { url: string; impressions: number; clicks: number; position: number | null };

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  const { data: posts } = await admin.from("blog_posts").select("id, slug, title, content_html, published_at").eq("status", "published").order("published_at", { ascending: true }).limit(200);

  const overview = await cacheGet<{ articles?: Row[]; fetchedAt?: string }>(admin, user.id, "overview", `${HOST}|28`, MONTH);
  const stats = new Map<string, Row>();
  for (const a of overview?.articles ?? []) stats.set(a.url.replace(/\/+$/, ""), a);

  const ids = (posts ?? []).map((p) => p.id as string);
  const { data: revs } = ids.length
    ? await admin.from("blog_post_revisions").select("id, post_id, status, new_words, created_at").in("post_id", ids).in("status", ["draft", "applied"]).order("created_at", { ascending: false })
    : { data: [] };
  const latest = new Map<string, { id: string; status: string; newWords: number }>();
  for (const r of revs ?? []) if (!latest.has(r.post_id as string)) latest.set(r.post_id as string, { id: r.id as string, status: r.status as string, newWords: r.new_words as number });

  const out = [];
  for (const p of posts ?? []) {
    const url = `https://${HOST}/blog/${p.slug}`;
    const words = wordCount((p.content_html as string) ?? "");
    const ageDays = p.published_at ? Math.max(0, Math.floor((Date.now() - new Date(p.published_at as string).getTime()) / 86_400_000)) : null;
    const s = stats.get(url);
    const ins = await cacheGet<Inspection>(admin, user.id, "inspect", url, MONTH);
    const v = refreshPriority({ words, ageDays, impressions: s?.impressions ?? null, clicks: s?.clicks ?? null, position: s?.position ?? null, indexed: ins ? ins.indexed : null });
    out.push({
      id: p.id, slug: p.slug, title: p.title, url, words, ageDays,
      impressions: s?.impressions ?? null, clicks: s?.clicks ?? null, position: s?.position ?? null,
      indexed: ins ? ins.indexed : null, indexState: ins?.state ?? null,
      priority: v.priority, reasons: v.reasons, revision: latest.get(p.id as string) ?? null,
    });
  }
  out.sort((a, b) => b.priority - a.priority || (b.ageDays ?? 0) - (a.ageDays ?? 0));
  return NextResponse.json({ posts: out, statsAsOf: overview?.fetchedAt ?? null });
}
