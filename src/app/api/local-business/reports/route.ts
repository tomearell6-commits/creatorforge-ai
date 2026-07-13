/**
 * GET  /api/local-business/reports?locationId=  — list saved reports (free)
 * POST /api/local-business/reports              — generate an AI performance
 *      report from available data (credit-metered).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargeLb } from "@/lib/local-business/service";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locationId = new URL(request.url).searchParams.get("locationId");
  let q = supabase.from("local_business_reports").select("id, location_id, report_type, data_json, created_at").order("created_at", { ascending: false }).limit(30);
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q;
  return NextResponse.json({ reports: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locationId } = (await request.json().catch(() => ({}))) as { locationId?: string };
  if (!locationId) return NextResponse.json({ error: "Select a business location." }, { status: 400 });

  const { data: loc } = await supabase.from("local_business_locations").select("business_name, primary_category, audit_score").eq("id", locationId).single();
  if (!loc) return NextResponse.json({ error: "Location not found." }, { status: 404 });

  const charge = await chargeLb("report");
  if (!charge.ok) return NextResponse.json({ error: "Insufficient credits", code: "insufficient_credits", required: charge.required, balance: charge.balance }, { status: 402 });

  const [{ count: posts }, { count: reviews }] = await Promise.all([
    supabase.from("local_business_posts").select("id", { count: "exact", head: true }).eq("location_id", locationId),
    supabase.from("local_business_reviews").select("id", { count: "exact", head: true }).eq("location_id", locationId),
  ]);
  const stats = { profileHealth: loc.audit_score ?? null, posts: posts ?? 0, reviews: reviews ?? 0 };

  let summary = `Profile Health ${stats.profileHealth ?? "—"}, ${stats.posts} posts, ${stats.reviews} reviews tracked.`;
  let recommendations: string[] = ["Keep posting weekly", "Complete every profile field", "Respond to reviews"];
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const msg = await client.messages.create({
        model: MODEL, max_tokens: 500,
        system: "You write a short local-marketing performance report. Return ONLY JSON {\"summary\":\"…\",\"recommendations\":[\"…\"]}. Honest, based only on the data given, no ranking claims or invented metrics.",
        messages: [{ role: "user", content: `Business: ${loc.business_name} (${loc.primary_category ?? "local business"}). Data: ${JSON.stringify(stats)}. Live Google metrics unavailable.` }],
      });
      const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      const p = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      summary = String(p.summary || summary);
      recommendations = Array.isArray(p.recommendations) ? p.recommendations.map(String).slice(0, 8) : recommendations;
    } catch { /* fallback */ }
  }

  const data_json = { summary, recommendations, stats, note: "Google profile metrics (views, calls, directions) require approved Business Profile Performance API access." };
  const { data: report } = await supabase.from("local_business_reports").insert({ user_id: user.id, location_id: locationId, report_type: "performance", data_json, credits_used: charge.charged }).select("id").single();
  return NextResponse.json({ reportId: report?.id, ...data_json, charged: charge.charged });
}
