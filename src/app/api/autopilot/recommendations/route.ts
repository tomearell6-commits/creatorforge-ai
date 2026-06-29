import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecommendations } from "@/lib/autopilot/recommendations";

/** GET /api/autopilot/recommendations?campaignId= — suggestions only (no auto-actions). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = new URL(request.url).searchParams.get("campaignId");
  let contentTypes: string[] = [];
  if (campaignId) {
    const { data: c } = await supabase.from("autopilot_campaigns").select("content_types").eq("id", campaignId).eq("user_id", user.id).maybeSingle();
    contentTypes = (c?.content_types as string[]) ?? [];
  }
  let q = supabase.from("autopilot_jobs").select("content_type, status, published_time, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
  if (campaignId) q = q.eq("campaign_id", campaignId);
  const { data: jobs } = await q;

  return NextResponse.json({ recommendations: generateRecommendations(contentTypes, jobs ?? []) });
}
