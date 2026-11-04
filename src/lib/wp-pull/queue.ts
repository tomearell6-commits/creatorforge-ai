import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyIndexNow } from "@/lib/seo/indexnow";

/**
 * The queue behind "pull delivery". Autopilot (or an owner's approval) puts a finished article here; the plugin on the
 * owner's WordPress site collects it with its secret token, creates the post itself, and reports back. Only then are
 * credits taken, the address announced to search engines, and the activity row turned into "published".
 */
export type PullPayload = {
  title: string; contentHtml: string; excerpt?: string; slug?: string; category?: string | null; tags: string[];
  metaTitle?: string; metaDescription?: string; focusKeyword?: string;
  imageUrl?: string; imageAlt?: string; status: "publish";
};
/** What is stored: the payload plus how many credits to take when delivery is confirmed. Never sent to the plugin. */
type Stored = PullPayload & { charge: number };

export const LEASE_MS = 10 * 60_000;
export const MAX_ATTEMPTS = 3;
const MAX_SITE_FAILURES = 3;

export async function enqueuePull(admin: SupabaseClient, a: {
  userId: string; wordpressSiteId: string; autopostSiteId: string | null; articleId: string; payload: PullPayload; charge: number;
}): Promise<string> {
  const stored: Stored = { ...a.payload, charge: a.charge };
  const { data, error } = await admin.from("wp_pull_queue").insert({
    user_id: a.userId, wordpress_site_id: a.wordpressSiteId, autopost_site_id: a.autopostSiteId, article_id: a.articleId, payload: stored,
  }).select("id").single();
  if (error || !data) throw new Error(`Could not queue the article for your website: ${error?.message ?? "unknown error"}`);
  return data.id as string;
}

/** The next article for this website, leased to the caller for a few minutes so two runs never take the same one. */
export async function claimNext(admin: SupabaseClient, wordpressSiteId: string): Promise<{ id: string; payload: PullPayload } | null> {
  const nowIso = new Date().toISOString();
  // An article the website collected but never confirmed, after too many tries, is given up on.
  await admin.from("wp_pull_queue").update({ status: "failed", error: "The website collected this article but never confirmed it was created." })
    .eq("wordpress_site_id", wordpressSiteId).eq("status", "delivering").lt("lease_until", nowIso).gte("attempts", MAX_ATTEMPTS);

  const find = (status: "pending" | "delivering") => {
    let q = admin.from("wp_pull_queue").select("id, payload, attempts, status").eq("wordpress_site_id", wordpressSiteId).eq("status", status).lt("attempts", MAX_ATTEMPTS);
    if (status === "delivering") q = q.lt("lease_until", nowIso); // collected, never confirmed, lease over: offer it again
    return q.order("created_at", { ascending: true }).limit(1);
  };
  let rows = (await find("pending")).data;
  if (!rows || rows.length === 0) rows = (await find("delivering")).data;
  const row = rows?.[0];
  if (!row) return null;

  const { data: claimed } = await admin.from("wp_pull_queue")
    .update({ status: "delivering", lease_until: new Date(Date.now() + LEASE_MS).toISOString(), attempts: (row.attempts as number) + 1 })
    .eq("id", row.id).eq("status", row.status as string).select("id").maybeSingle();
  if (!claimed) return null; // someone else took it first

  const { charge: _charge, ...payload } = row.payload as Stored;
  void _charge;
  return { id: row.id as string, payload };
}

export type DeliveryReport = { ok: boolean; postId?: string | number; url?: string; status?: string; error?: string };

/** The plugin says it created the post (or could not). Idempotent: a second report for the same article changes nothing. */
export async function completeDelivery(admin: SupabaseClient, wordpressSiteId: string, queueId: string, report: DeliveryReport): Promise<{ ok: true; message: string } | { ok: false; error: string; status: number }> {
  const { data: item } = await admin.from("wp_pull_queue").select("*").eq("id", queueId).eq("wordpress_site_id", wordpressSiteId).maybeSingle();
  if (!item) return { ok: false, error: "Unknown article.", status: 404 };
  if (item.status === "delivered") return { ok: true, message: "Already recorded." };

  const articleId = item.article_id as string | null;
  const siteId = item.autopost_site_id as string | null;
  const nowIso = new Date().toISOString();

  if (!report.ok) {
    const error = String(report.error ?? "The website could not create the post.").slice(0, 300);
    if ((item.attempts as number) < MAX_ATTEMPTS) {
      await admin.from("wp_pull_queue").update({ status: "pending", lease_until: null, error }).eq("id", queueId).eq("status", "delivering");
      return { ok: true, message: "Noted. It will be offered again." };
    }
    await admin.from("wp_pull_queue").update({ status: "failed", error }).eq("id", queueId);
    if (articleId) {
      await admin.from("seo_articles").update({ status: "failed", updated_at: nowIso }).eq("id", articleId);
      await admin.from("seo_autopost_log").update({ status: "failed", message: `Your website could not create the post: ${error}` }).eq("article_id", articleId).eq("status", "drafted");
    }
    if (siteId) {
      const { data: s } = await admin.from("seo_autopost_sites").select("consecutive_failures").eq("id", siteId).maybeSingle();
      const failures = ((s?.consecutive_failures as number) ?? 0) + 1;
      await admin.from("seo_autopost_sites").update({
        consecutive_failures: failures, updated_at: nowIso,
        ...(failures >= MAX_SITE_FAILURES ? { active: false, paused_reason: `Paused: your website could not create the post (${error})` } : {}),
      }).eq("id", siteId);
    }
    return { ok: true, message: "Recorded as failed." };
  }

  // Exactly one caller wins the move to "delivered"; only that caller does the paid, outward-facing work.
  const postId = report.postId !== undefined ? String(report.postId) : null;
  const url = (report.url ?? "").slice(0, 500) || null;
  const { data: won } = await admin.from("wp_pull_queue")
    .update({ status: "delivered", post_id: postId, post_url: url, delivered_at: nowIso, lease_until: null, error: null })
    .eq("id", queueId).eq("wordpress_site_id", wordpressSiteId).in("status", ["delivering", "pending"]).select("id").maybeSingle();
  if (!won) return { ok: true, message: "Already recorded." };

  const stored = item.payload as Stored;
  const live = (report.status ?? "publish") === "publish";
  if (articleId) {
    await admin.from("seo_articles").update({ status: live ? "published" : "draft", wordpress_post_id: postId, published_at: live ? nowIso : null, updated_at: nowIso }).eq("id", articleId);
  }
  await admin.from("wordpress_publish_history").insert({
    user_id: item.user_id, article_id: articleId, wordpress_site_id: wordpressSiteId, status: live ? "published" : "pending_on_site",
    wordpress_post_id: postId, post_url: live ? url : null, published_at: live ? nowIso : null,
  });
  if (stored.charge > 0) await admin.rpc("wallet_adjust", { p_user: item.user_id, p_amount: -stored.charge, p_type: "publishing", p_reason: "seo_autopost_pull" });

  const indexNow = live && url ? await notifyIndexNow(admin, url) : { message: "Created on your website, which is holding it for your approval there. It is not public yet." };

  if (siteId) {
    const { data: s } = await admin.from("seo_autopost_sites").select("posts_published").eq("id", siteId).maybeSingle();
    await admin.from("seo_autopost_sites").update({
      posts_published: ((s?.posts_published as number) ?? 0) + 1, last_success_at: nowIso, consecutive_failures: 0, paused_reason: null, updated_at: nowIso,
    }).eq("id", siteId);
  }
  if (articleId) {
    const { data: updated } = await admin.from("seo_autopost_log")
      .update({ status: live ? "published" : "drafted", post_url: live ? url : null, message: indexNow.message, credits_charged: stored.charge })
      .eq("article_id", articleId).eq("status", "drafted").select("id");
    if (!updated || updated.length === 0) {
      await admin.from("seo_autopost_log").insert({ user_id: item.user_id, site_id: siteId, article_id: articleId, status: live ? "published" : "drafted", title: stored.title, post_url: live ? url : null, message: indexNow.message, credits_charged: stored.charge });
    }
  }
  return { ok: true, message: "Recorded." };
}
