import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSeoPackage, willUseRealSeoAI } from "@/lib/seo/generate";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { SEO_CREDIT_COSTS } from "@/lib/constants";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { logEvent } from "@/lib/analytics";

/**
 * SEO Content Studio — generate a full SEO package and save it as a draft article.
 * Charges SEO_CREDIT_COSTS.article only when real AI is used (placeholder is free).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "seo-generate", 15, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const body = await request.json();
  if (!body.mainKeyword?.trim()) return NextResponse.json({ error: "Main keyword is required." }, { status: 400 });

  const billable = willUseRealSeoAI();
  if (billable && (await getCreditBalance()) < SEO_CREDIT_COSTS.article) {
    return NextResponse.json({ error: "Not enough credits for a full SEO article. Upgrade your plan.", code: "insufficient_credits" }, { status: 402 });
  }

  const { pkg, usedAI } = await generateSeoPackage({
    mainKeyword: body.mainKeyword,
    secondaryKeywords: body.secondaryKeywords,
    targetCountry: body.targetCountry,
    targetAudience: body.targetAudience,
    searchIntent: body.searchIntent,
    articleType: body.articleType,
    tone: body.tone,
    wordCount: body.wordCount,
    language: body.language,
    brandName: body.brandName,
    productName: body.productName,
    cta: body.cta,
  });

  const { data: article, error } = await supabase
    .from("seo_articles")
    .insert({
      user_id: user.id,
      main_keyword: body.mainKeyword.trim(),
      secondary_keywords: pkg.secondaryKeywords,
      target_country: body.targetCountry ?? null,
      target_audience: body.targetAudience ?? null,
      search_intent: pkg.searchIntent,
      article_type: body.articleType ?? null,
      tone: body.tone ?? null,
      word_count: body.wordCount ?? null,
      language: body.language ?? "en",
      seo_title: pkg.seoTitle,
      meta_title: pkg.metaTitle,
      meta_description: pkg.metaDescription,
      slug: pkg.slug,
      h1: pkg.h1,
      outline_json: pkg.outline,
      article_content: pkg.articleContent,
      faq_json: pkg.faq,
      schema_recommendation: pkg.schemaRecommendation,
      image_prompts_json: pkg.imagePrompts,
      featured_image_prompt: pkg.featuredImagePrompt,
      alt_text_json: pkg.altText,
      excerpt: pkg.excerpt,
      tags: pkg.tags,
      category: pkg.category,
      internal_links: pkg.internalLinks,
      external_links: pkg.externalLinks,
      cta: pkg.cta,
      social_captions: pkg.socialCaptions,
      newsletter_summary: pkg.newsletterSummary,
      seo_score: pkg.seoScore,
      readability_score: pkg.readabilityScore,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (billable) await deductCredits(SEO_CREDIT_COSTS.article, "seo_article");
  await logEvent(supabase, { userId: user.id, eventType: "video_created", metadata: { kind: "seo_article" } });

  return NextResponse.json({ article, usedAI });
}
