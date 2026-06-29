import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/security/secrets";
import { publishArticleToWordPress } from "@/lib/seo/publish";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { SEO_CREDIT_COSTS } from "@/lib/constants";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { captureError } from "@/lib/logger";

/**
 * Publish an SEO article to a connected WordPress site.
 * POST { articleId, siteId, mode: "draft" | "now" | "schedule", scheduledAt? }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "wp-publish", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const { articleId, siteId, mode, scheduledAt } = await request.json();
  if (!articleId || !siteId) return NextResponse.json({ error: "articleId and siteId are required." }, { status: 400 });
  if (mode === "schedule" && !scheduledAt) return NextResponse.json({ error: "Pick a date/time to schedule." }, { status: 400 });

  const { data: article } = await supabase.from("seo_articles").select("*").eq("id", articleId).single();
  if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
  // RLS already scopes to the owner; select includes the encrypted password.
  const { data: site } = await supabase.from("wordpress_sites").select("*").eq("id", siteId).single();
  if (!site) return NextResponse.json({ error: "WordPress site not found." }, { status: 404 });

  if ((await getCreditBalance()) < SEO_CREDIT_COSTS.publish) {
    return NextResponse.json({ error: "Not enough credits to publish.", code: "insufficient_credits" }, { status: 402 });
  }

  const appPassword = decryptSecret(site.encrypted_application_password);
  if (!appPassword) return NextResponse.json({ error: "Could not read the site credentials — reconnect the site." }, { status: 400 });

  const wpStatus = mode === "now" ? "publish" : mode === "schedule" ? "future" : "draft";
  const result = await publishArticleToWordPress({
    siteUrl: site.site_url,
    username: site.username,
    appPassword,
    title: article.seo_title || article.h1 || article.main_keyword,
    contentHtml: article.article_content || "",
    excerpt: article.excerpt,
    slug: article.slug,
    category: article.category || site.default_category,
    tags: article.tags,
    metaTitle: article.meta_title,
    metaDescription: article.meta_description,
    focusKeyword: article.main_keyword,
    status: wpStatus,
    scheduledAt: mode === "schedule" ? scheduledAt : null,
  });

  const articleStatus = mode === "now" ? "published" : mode === "schedule" ? "scheduled" : "draft";

  if (!result.ok) {
    captureError(result.error, { category: "publishing", platform: "wordpress", articleId });
    await supabase.from("wordpress_publish_history").insert({
      user_id: user.id, article_id: articleId, wordpress_site_id: siteId, status: "failed", error: result.error,
    });
    await supabase.from("seo_articles").update({ status: "failed", wordpress_site_id: siteId }).eq("id", articleId);
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await deductCredits(SEO_CREDIT_COSTS.publish, "wordpress_publish");
  await supabase.from("seo_articles").update({
    status: articleStatus,
    wordpress_site_id: siteId,
    wordpress_post_id: result.postId,
    scheduled_at: mode === "schedule" ? scheduledAt : null,
    published_at: mode === "now" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", articleId);
  await supabase.from("wordpress_publish_history").insert({
    user_id: user.id, article_id: articleId, wordpress_site_id: siteId,
    status: articleStatus, wordpress_post_id: result.postId, post_url: result.url,
    published_at: mode === "now" ? new Date().toISOString() : null,
  });

  return NextResponse.json({ ok: true, postId: result.postId, url: result.url, status: result.status });
}
