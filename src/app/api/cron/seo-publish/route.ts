import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/security/secrets";
import { publishArticleToWordPress } from "@/lib/seo/publish";
import { generateFeaturedImage } from "@/lib/seo/featured-image";
import { SEO_CREDIT_COSTS } from "@/lib/constants";
import { captureError } from "@/lib/logger";

/**
 * Scheduled SEO publisher (Vercel Cron). Publishes due scheduled articles to
 * WordPress. Secured by CRON_SECRET (Vercel sends it as a Bearer token). Runs
 * with the service-role client (no user session) and deducts credits directly.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.CRON_SECRET && request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due } = await admin
    .from("seo_articles")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .is("wordpress_post_id", null)
    .limit(25);

  const results: { id: string; ok: boolean; note?: string }[] = [];

  for (const article of due ?? []) {
    try {
      const { data: site } = await admin.from("wordpress_sites").select("*").eq("id", article.wordpress_site_id).single();
      if (!site) { results.push({ id: article.id, ok: false, note: "no site" }); continue; }

      const appPassword = decryptSecret(site.encrypted_application_password);
      if (!appPassword) { results.push({ id: article.id, ok: false, note: "bad creds" }); continue; }

      // Credit check (service-role direct).
      const { data: profile } = await admin.from("profiles").select("credits").eq("user_id", article.user_id).maybeSingle();
      if ((profile?.credits ?? 0) < SEO_CREDIT_COSTS.publish) {
        await admin.from("seo_articles").update({ status: "failed" }).eq("id", article.id);
        await admin.from("wordpress_publish_history").insert({ user_id: article.user_id, article_id: article.id, wordpress_site_id: site.id, status: "failed", error: "Insufficient credits" });
        results.push({ id: article.id, ok: false, note: "insufficient credits" });
        continue;
      }

      const featured = await generateFeaturedImage(article.featured_image_prompt);
      const imageBillable = featured && featured.provider !== "placeholder";

      const result = await publishArticleToWordPress({
        siteUrl: site.site_url, username: site.username, appPassword,
        title: article.seo_title || article.h1 || article.main_keyword,
        contentHtml: article.article_content || "", excerpt: article.excerpt, slug: article.slug,
        category: article.category || site.default_category, tags: article.tags,
        metaTitle: article.meta_title, metaDescription: article.meta_description, focusKeyword: article.main_keyword,
        status: "publish",
        featuredImage: featured ? { data: featured.data, contentType: featured.contentType } : null,
      });

      if (!result.ok) {
        await admin.from("seo_articles").update({ status: "failed" }).eq("id", article.id);
        await admin.from("wordpress_publish_history").insert({ user_id: article.user_id, article_id: article.id, wordpress_site_id: site.id, status: "failed", error: result.error });
        results.push({ id: article.id, ok: false, note: result.error });
        continue;
      }

      // Deduct credits (publish + featured image when a real provider was used).
      const cost = SEO_CREDIT_COSTS.publish + (imageBillable ? SEO_CREDIT_COSTS.featuredImage : 0);
      await admin.from("profiles").update({ credits: Math.max(0, (profile?.credits ?? 0) - cost) }).eq("user_id", article.user_id);
      await admin.from("credit_usage").insert({ user_id: article.user_id, amount: -cost, reason: "seo_scheduled_publish" });

      await admin.from("seo_articles").update({
        status: "published", wordpress_post_id: result.postId, published_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", article.id);
      await admin.from("wordpress_publish_history").insert({
        user_id: article.user_id, article_id: article.id, wordpress_site_id: site.id,
        status: "published", wordpress_post_id: result.postId, post_url: result.url, published_at: new Date().toISOString(),
      });
      results.push({ id: article.id, ok: true });
    } catch (err) {
      captureError(err, { category: "publishing", platform: "wordpress", cron: true, articleId: article.id });
      results.push({ id: article.id, ok: false, note: "exception" });
    }
  }

  return NextResponse.json({ processed: results.length, results, ranAt: nowIso });
}
