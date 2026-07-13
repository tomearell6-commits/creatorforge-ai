/**
 * GET  /api/social-business/reports — list saved reports (free)
 * POST /api/social-business/reports — generate an AI social report from available
 *      data (credit-metered). Honest — no invented provider metrics.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeSocial } from "@/lib/social/service";
import { SOCIAL_CREDIT_COSTS } from "@/config/socialContentCapabilities";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("social_reports").select("id, report_type, data_json, created_at").order("created_at", { ascending: false }).limit(30);
  return NextResponse.json({ reports: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reportType } = (await request.json().catch(() => ({}))) as { reportType?: string };
  const type = reportType || "monthly";

  const charge = await chargeSocial(SOCIAL_CREDIT_COSTS.report, "report");
  if (!charge.ok) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: charge.required, balance: charge.balance }, { status: 402 });

  const [posts, published, failed, campaigns] = await Promise.all([
    supabase.from("social_publish_jobs").select("id", { count: "exact", head: true }),
    supabase.from("social_publish_jobs").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("social_publish_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("social_campaigns").select("id", { count: "exact", head: true }),
  ]);
  const stats = { posts: posts.count ?? 0, published: published.count ?? 0, failed: failed.count ?? 0, campaigns: campaigns.count ?? 0 };

  let summary = `${stats.campaigns} campaigns, ${stats.posts} posts (${stats.published} published, ${stats.failed} failed).`;
  let recommendations: string[] = ["Post consistently across platforms", "Repurpose top content", "Reply to enquiries promptly"];
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const msg = await client.messages.create({
        model: MODEL, max_tokens: 500,
        system: "You write a short social media performance report. Return ONLY JSON {\"summary\":\"…\",\"recommendations\":[\"…\"]}. Honest, based only on the data given; note that provider reach/engagement metrics require approved analytics APIs.",
        messages: [{ role: "user", content: `Report type: ${type}. Data: ${JSON.stringify(stats)}. Provider metrics unavailable.` }],
      });
      const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      const p = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      summary = String(p.summary || summary);
      recommendations = Array.isArray(p.recommendations) ? p.recommendations.map(String).slice(0, 8) : recommendations;
    } catch { /* fallback */ }
  }

  const data_json = { summary, recommendations, stats, note: "Reach/impressions/engagement require each platform's approved analytics API." };
  const { data: report } = await supabase.from("social_reports").insert({ user_id: user.id, report_type: type, data_json, credits_used: charge.charged }).select("id").single();
  return NextResponse.json({ reportId: report?.id, ...data_json, charged: charge.charged });
}
