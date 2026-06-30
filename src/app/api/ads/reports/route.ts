import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/ads/reports?campaignId=
 * Returns stored performance metrics. Live metrics require a connected ad account
 * whose API exposes reporting; until then this is empty and the UI shows
 * "reporting limited / connect an account".
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = new URL(request.url).searchParams.get("campaignId");
  let q = supabase.from("campaign_reports")
    .select("campaign_id, platform, clicks, impressions, reach, spend, conversions, ctr, cpc, cpa, roas, reported_at")
    .eq("user_id", user.id).order("reported_at", { ascending: false });
  if (campaignId) q = q.eq("campaign_id", campaignId);
  const { data } = await q;
  return NextResponse.json({ reports: data ?? [], limited: (data ?? []).length === 0 });
}
