/**
 * SEO Auto-Poster plan limits and cost estimates.
 * Plan ids are the stable internal ids: free | creator | pro | agency | enterprise.
 */
import { SEO_CREDIT_COSTS } from "@/lib/constants";

/** Credits for one finished post: article + WordPress publish + featured image. */
export const CREDITS_PER_POST = SEO_CREDIT_COSTS.article + SEO_CREDIT_COSTS.publish + SEO_CREDIT_COSTS.featuredImage;

/** In review mode the work is paid when the article is written, the publish fee when you approve it. */
export const ARTICLE_IMAGE_CREDITS = SEO_CREDIT_COSTS.article + SEO_CREDIT_COSTS.featuredImage;
export const PUBLISH_CREDITS = SEO_CREDIT_COSTS.publish;
/** Stop writing new drafts while this many are still waiting for the owner. */
export const MAX_PENDING_REVIEW = 5;

/** One-time credits to analyse a website (brand, competitors, keywords and a 30-day plan). */
export const SEO_ANALYSIS_CREDITS = 15;

/** How many websites a plan may auto-post to. Free trial is excluded (it is a daily-spend feature). */
export function siteLimitForPlan(plan: string | null | undefined): number {
  switch (plan) {
    case "creator": return 1;
    case "pro": return 3;
    case "agency": return 10;
    case "enterprise": return 50;
    default: return 0;
  }
}

/** Rough monthly credit use for a site at a given pace (30 days). */
export function estimateMonthlyCredits(postsPerDay: number): number {
  return CREDITS_PER_POST * Math.max(1, Math.min(2, postsPerDay)) * 30;
}
