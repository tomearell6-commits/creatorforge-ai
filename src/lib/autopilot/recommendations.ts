/**
 * Heuristic Autopilot recommendations — SUGGESTIONS ONLY, never auto-actions.
 * Looks at the campaign mix + recent activity and proposes balance/cadence tips.
 */
type JobRow = { content_type: string; status: string; published_time: string | null; created_at: string };

export function generateRecommendations(contentTypes: string[], jobs: JobRow[]): string[] {
  const recs: string[] = [];

  const videoTypes = ["ai_shorts", "long_video", "product_ad"];
  const videoCount = jobs.filter((j) => videoTypes.includes(j.content_type)).length;
  const blogCount = jobs.filter((j) => ["blog", "seo_article"].includes(j.content_type)).length;

  if (videoCount > 0 && blogCount === 0) recs.push("You are publishing mostly videos. Consider adding one SEO article each week to capture search traffic.");
  if (blogCount > 0) {
    const lastBlog = jobs.filter((j) => ["blog", "seo_article"].includes(j.content_type) && j.published_time).sort((a, b) => new Date(b.published_time!).getTime() - new Date(a.published_time!).getTime())[0];
    const days = lastBlog ? Math.floor((Date.now() - new Date(lastBlog.published_time!).getTime()) / 86_400_000) : 999;
    if (days >= 14) recs.push(`Your blog has not been updated in ${days >= 999 ? "a while" : days + " days"}. Schedule a fresh article to keep momentum.`);
  }
  if (!contentTypes.includes("newsletter")) recs.push("Add an email newsletter to re-engage your audience and recycle your best content.");
  if (!contentTypes.includes("social_post")) recs.push("Social posts are cheap (1 credit) and amplify your videos and articles — consider adding them.");

  const failed = jobs.filter((j) => j.status === "failed").length;
  if (failed > 0) recs.push(`${failed} job(s) failed recently. Check your connected accounts and credit balance, then retry them from the Publishing Queue.`);

  if (recs.length === 0) recs.push("Your content mix looks balanced. Keep a consistent cadence and review your weekly report to spot what resonates.");
  return recs;
}
