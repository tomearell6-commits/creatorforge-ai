/**
 * Review mode: approve (publish) or reject an article the auto-poster wrote and saved.
 * Server-only; uses the service-role client AFTER the route has confirmed ownership.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/security/secrets";
import { fetchWithTimeout } from "@/lib/http";
import { publishArticleToWordPress } from "@/lib/seo/publish";
import { notifyIndexNow } from "@/lib/seo/indexnow";
import { PUBLISH_CREDITS, ARTICLE_IMAGE_CREDITS } from "./limits";

export type ReviewResult =
  | { ok: true; message: string; url?: string }
  | { ok: false; error: string; status: number };

type DraftRow = {
  id: string; user_id: string; wordpress_site_id: string; autopost_site_id: string | null; status: string;
  seo_title: string | null; h1: string | null; main_keyword: string | null; article_content: string | null; excerpt: string | null;
  slug: string | null; category: string | null; tags: string[] | null; meta_title: string | null; meta_description: string | null;
  metadata: { featuredImageUrl?: string; focusKeyword?: string; logId?: string } | null;
};

async function loadDraft(admin: SupabaseClient, articleId: string, userId: string): Promise<DraftRow | null> {
  const { data } = await admin.from("seo_articles").select("*").eq("id", articleId).eq("user_id", userId).eq("source", "autopost").maybeSingle();
  return (data as DraftRow | null) ?? null;
}

/** Publish a draft to the connected WordPress site. */
export async function approveDraft(admin: SupabaseClient, articleId: string, userId: string): Promise<ReviewResult> {
  const d = await loadDraft(admin, articleId, userId);
  if (!d) return { ok: false, error: "Article not found.", status: 404 };
  if (d.status !== "pending_review") return { ok: false, error: "This article is not waiting for review any more.", status: 409 };

  const { data: prof } = await admin.from("profiles").select("credits").eq("user_id", userId).maybeSingle();
  if ((prof?.credits ?? 0) < PUBLISH_CREDITS) return { ok: false, error: `Not enough credits to publish (${PUBLISH_CREDITS} needed).`, status: 402 };

  const { data: wp } = await admin.from("wordpress_sites").select("*").eq("id", d.wordpress_site_id).maybeSingle();
  if (!wp) return { ok: false, error: "The WordPress site is no longer connected.", status: 409 };
  const appPassword = decryptSecret(wp.encrypted_application_password as string);
  if (!appPassword) return { ok: false, error: "Could not read the saved WordPress login — please reconnect the site.", status: 409 };

  // Claim the draft so a double-click cannot publish it twice.
  const { data: claimed } = await admin.from("seo_articles").update({ status: "publishing", updated_at: new Date().toISOString() })
    .eq("id", articleId).eq("status", "pending_review").select("id").maybeSingle();
  if (!claimed) return { ok: false, error: "This article is already being published.", status: 409 };

  // The image was rendered when the article was written; re-use it.
  let featured: { data: Uint8Array; contentType: string } | null = null;
  const imgUrl = d.metadata?.featuredImageUrl;
  if (imgUrl) {
    try {
      const r = await fetchWithTimeout(imgUrl, {}, 30_000);
      if (r.ok) featured = { data: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get("content-type") || "image/jpeg" };
    } catch { /* publish without the image rather than lose the article */ }
  }

  const res = await publishArticleToWordPress({
    siteUrl: wp.site_url as string, username: wp.username as string, appPassword,
    title: d.seo_title || d.h1 || d.main_keyword || "Article", contentHtml: d.article_content || "", excerpt: d.excerpt ?? undefined, slug: d.slug ?? undefined,
    category: d.category, tags: d.tags ?? [], metaTitle: d.meta_title ?? undefined, metaDescription: d.meta_description ?? undefined,
    focusKeyword: d.metadata?.focusKeyword || d.main_keyword || undefined, status: "publish", featuredImage: featured,
  });
  if (!res.ok) {
    // Put it back in the queue so the owner can try again.
    await admin.from("seo_articles").update({ status: "pending_review", updated_at: new Date().toISOString() }).eq("id", articleId);
    return { ok: false, error: `WordPress did not accept the article: ${res.error}`, status: 502 };
  }

  const nowIso = new Date().toISOString();
  await admin.from("seo_articles").update({ status: "published", wordpress_post_id: res.postId, published_at: nowIso, updated_at: nowIso }).eq("id", articleId);
  await admin.from("wordpress_publish_history").insert({ user_id: userId, article_id: articleId, wordpress_site_id: d.wordpress_site_id, status: "published", wordpress_post_id: res.postId, post_url: res.url, published_at: nowIso });
  await admin.rpc("wallet_adjust", { p_user: userId, p_amount: -PUBLISH_CREDITS, p_type: "publishing", p_reason: "seo_autopost_publish" });
  const indexNow = await notifyIndexNow(admin, res.url);

  // Update the SAME activity row (one row per article keeps the daily quota correct).
  if (d.metadata?.logId) {
    await admin.from("seo_autopost_log").update({ status: "published", post_url: res.url, message: indexNow.message, credits_charged: PUBLISH_CREDITS + ARTICLE_IMAGE_CREDITS }).eq("id", d.metadata.logId);
  }
  if (d.autopost_site_id) {
    const { data: site } = await admin.from("seo_autopost_sites").select("posts_published").eq("id", d.autopost_site_id).maybeSingle();
    await admin.from("seo_autopost_sites").update({ posts_published: ((site?.posts_published as number) ?? 0) + 1, last_success_at: nowIso }).eq("id", d.autopost_site_id);
  }
  return { ok: true, message: `Published. ${indexNow.message}`, url: res.url };
}

/** Discard a draft. Its writing cost is not refunded (the article was already produced). */
export async function rejectDraft(admin: SupabaseClient, articleId: string, userId: string): Promise<ReviewResult> {
  const d = await loadDraft(admin, articleId, userId);
  if (!d) return { ok: false, error: "Article not found.", status: 404 };
  if (d.status !== "pending_review") return { ok: false, error: "This article is not waiting for review any more.", status: 409 };
  const { data: done } = await admin.from("seo_articles").update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", articleId).eq("status", "pending_review").select("id").maybeSingle();
  if (!done) return { ok: false, error: "This article was already handled.", status: 409 };
  if (d.metadata?.logId) await admin.from("seo_autopost_log").update({ status: "rejected", message: "Rejected by you." }).eq("id", d.metadata.logId);
  return { ok: true, message: "Article rejected." };
}
