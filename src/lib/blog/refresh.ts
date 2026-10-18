import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countWords, generateSeoPackage } from "@/lib/seo/generate";
import { estimateReadingMinutes, sanitizeBlogHtml } from "@/lib/blog/blog";
import { blogPostUrl, notifyIndexNow } from "@/lib/seo/indexnow";
import { ensureInternalLinks } from "@/lib/seo/autopost/links";
import { wordCount } from "./refresh-rank";

/**
 * Refresh an older CreatorsForge blog post: write a fuller version as a DRAFT revision, show it next to
 * the old one, apply it only when the owner approves, and keep the old version so it can be restored.
 * The address (slug), headline, search title/description, tags, category and publish date never change.
 */
export type RevisionRow = {
  id: string; post_id: string; status: "draft" | "applied" | "undone" | "discarded";
  new_html: string; new_faq: unknown; new_excerpt: string | null; new_reading_minutes: number | null; new_seo_score: number | null; new_words: number;
  old_html: string; old_faq: unknown; old_excerpt: string | null; old_reading_minutes: number | null; old_seo_score: number | null; old_words: number;
  created_at: string; applied_at: string | null; undone_at: string | null;
};

const MIN_WORDS = 1500;

export async function generateRevision(admin: SupabaseClient, userId: string, postId: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: post } = await admin.from("blog_posts")
    .select("id, slug, title, content_html, faq_json, excerpt, reading_minutes, seo_score, focus_keyword, category, tags, status")
    .eq("id", postId).maybeSingle();
  if (!post) return { ok: false, error: "That post was not found." };
  if (post.status !== "published") return { ok: false, error: "Only published posts can be refreshed." };

  const { data: others } = await admin.from("blog_posts").select("slug, title").eq("status", "published").neq("id", postId).order("published_at", { ascending: false }).limit(40);
  const links = (others ?? []).filter((o) => o.slug && o.title).map((o) => ({ url: blogPostUrl(o.slug as string), title: o.title as string }));

  const oldHtml = (post.content_html as string) ?? "";
  const plain = oldHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  let pkg;
  try {
    ({ pkg } = await generateSeoPackage(
      {
        mainKeyword: (post.focus_keyword as string) || (post.title as string),
        secondaryKeywords: Array.isArray(post.tags) ? (post.tags as string[]).slice(0, 6) : undefined,
        articleType: (post.category as string) || "Blog",
        targetAudience: "creators, marketers and small businesses",
        brandName: "CreatorsForge",
        productName: "CreatorsForge",
        cta: "Start free at CreatorsForge.io",
        minWords: MIN_WORDS,
        internalLinks: links.length ? links : undefined,
        refreshOf: { title: post.title as string, text: plain },
        model: process.env.SEO_AUTOPOST_MODEL || "claude-sonnet-5-5",
      },
      { strict: true },
    ));
  } catch (e) {
    return { ok: false, error: `The new version could not be written: ${e instanceof Error ? e.message : "unknown error"}` };
  }

  const withLinks = ensureInternalLinks(pkg.articleContent, links, { siteUrl: "https://www.creatorsforge.io", keyword: (post.focus_keyword as string) || (post.title as string), title: post.title as string }).html;
  const html = sanitizeBlogHtml(withLinks);
  const newWords = wordCount(html);
  if (newWords < MIN_WORDS) return { ok: false, error: `The new version came out too short (${newWords} words), so it was not kept. Please try again.` };

  // A new attempt replaces any unapproved earlier draft for this post.
  await admin.from("blog_post_revisions").update({ status: "discarded" }).eq("post_id", postId).eq("status", "draft");

  const { data: rev, error } = await admin.from("blog_post_revisions").insert({
    post_id: postId, created_by: userId, status: "draft",
    new_html: html, new_faq: pkg.faq ?? [], new_excerpt: pkg.excerpt || null, new_reading_minutes: estimateReadingMinutes(html),
    new_seo_score: typeof pkg.seoScore === "number" ? pkg.seoScore : null, new_words: newWords,
    old_html: oldHtml, old_faq: post.faq_json ?? [], old_excerpt: (post.excerpt as string) ?? null, old_reading_minutes: (post.reading_minutes as number) ?? null,
    old_seo_score: (post.seo_score as number) ?? null, old_words: wordCount(oldHtml),
  }).select("id").single();
  if (error || !rev) return { ok: false, error: error?.message ?? "Could not save the new version." };
  return { ok: true, id: rev.id as string };
}

/** Publish the new version. The previous one stays stored in the revision for undo. */
export async function applyRevision(admin: SupabaseClient, revisionId: string): Promise<{ ok: true; message: string } | { ok: false; error: string; status: number }> {
  const { data: rev } = await admin.from("blog_post_revisions").select("*").eq("id", revisionId).maybeSingle();
  if (!rev) return { ok: false, error: "Revision not found.", status: 404 };
  const r = rev as RevisionRow;
  if (r.status !== "draft") return { ok: false, error: "This version is not waiting for approval any more.", status: 409 };

  const { data: post, error } = await admin.from("blog_posts").update({
    content_html: r.new_html, faq_json: r.new_faq, excerpt: r.new_excerpt, reading_minutes: r.new_reading_minutes, seo_score: r.new_seo_score,
    updated_at: new Date().toISOString(),
  }).eq("id", r.post_id).eq("status", "published").select("slug").maybeSingle();
  if (error) return { ok: false, error: error.message, status: 500 };
  if (!post) return { ok: false, error: "The post is no longer published.", status: 409 };

  await admin.from("blog_post_revisions").update({ status: "applied", applied_at: new Date().toISOString() }).eq("id", revisionId);
  const ping = await notifyIndexNow(admin, blogPostUrl(post.slug as string));
  return { ok: true, message: `Published the fuller version. ${ping.message}` };
}

/** Put the previous version back. */
export async function undoRevision(admin: SupabaseClient, revisionId: string): Promise<{ ok: true; message: string } | { ok: false; error: string; status: number }> {
  const { data: rev } = await admin.from("blog_post_revisions").select("*").eq("id", revisionId).maybeSingle();
  if (!rev) return { ok: false, error: "Revision not found.", status: 404 };
  const r = rev as RevisionRow;
  if (r.status !== "applied") return { ok: false, error: "Only an applied version can be undone.", status: 409 };

  const { data: post, error } = await admin.from("blog_posts").update({
    content_html: r.old_html, faq_json: r.old_faq, excerpt: r.old_excerpt, reading_minutes: r.old_reading_minutes, seo_score: r.old_seo_score,
    updated_at: new Date().toISOString(),
  }).eq("id", r.post_id).select("slug").maybeSingle();
  if (error) return { ok: false, error: error.message, status: 500 };
  if (!post) return { ok: false, error: "The post was not found.", status: 404 };

  await admin.from("blog_post_revisions").update({ status: "undone", undone_at: new Date().toISOString() }).eq("id", revisionId);
  const ping = await notifyIndexNow(admin, blogPostUrl(post.slug as string));
  return { ok: true, message: `Restored the previous version. ${ping.message}` };
}

export async function discardRevision(admin: SupabaseClient, revisionId: string): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { data } = await admin.from("blog_post_revisions").update({ status: "discarded" }).eq("id", revisionId).eq("status", "draft").select("id").maybeSingle();
  return data ? { ok: true } : { ok: false, error: "That version is not waiting for approval.", status: 409 };
}

export { countWords };
