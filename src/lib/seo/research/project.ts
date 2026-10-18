/**
 * Runs a website analysis in the background and saves it onto the seo_projects row, with
 * live progress text the dashboard shows. Credits are charged only when the analysis
 * succeeds. Uses the service-role client (it runs after the HTTP response has been sent).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { captureError } from "@/lib/logger";
import { analyzeWebsite } from "./analyze";
import { PolicyBlockedError } from "@/lib/seo/policy";
import { SEO_ANALYSIS_CREDITS } from "@/lib/seo/autopost/limits";

export async function runProjectAnalysis(admin: SupabaseClient, projectId: string, userId: string, origin: string): Promise<void> {
  const progress = async (text: string) => {
    await admin.from("seo_projects").update({ progress: text, updated_at: new Date().toISOString() }).eq("id", projectId).then(() => {}, () => {});
  };
  try {
    const r = await analyzeWebsite(origin, progress);
    const now = new Date().toISOString();
    const { error } = await admin.from("seo_projects").update({
      status: "ready", progress: null, error: null, name: r.brand.name || new URL(origin).hostname,
      brand: r.brand, competitors: r.competitors, keywords: r.keywords, gaps: r.gaps, plan: r.plan,
      language: r.brand.language || "en", analyzed_at: now, updated_at: now,
    }).eq("id", projectId);
    if (error) throw new Error(error.message);
    await admin.rpc("wallet_adjust", { p_user: userId, p_amount: -SEO_ANALYSIS_CREDITS, p_type: "generation", p_reason: "seo_website_analysis" });
  } catch (e) {
    if (!(e instanceof PolicyBlockedError)) captureError(e, { category: "jobs", feature: "seo-analysis", projectId });
    const message = e instanceof Error ? e.message : "The analysis failed.";
    // Technical notes (if any) go into a field the dashboard does not show, so support can see what the model returned.
    const diag = (e as { diag?: string[] } | null)?.diag;
    await admin.from("seo_projects").update({
      status: "failed", progress: null, error: message.slice(0, 300), updated_at: new Date().toISOString(),
      ...(diag && diag.length ? { gaps: [`diagnostic: ${diag.join(" | ").slice(0, 3000)}`] } : {}),
    }).eq("id", projectId);
  }
}
