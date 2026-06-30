import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance } from "@/lib/credits";
import { generatePlan, estimatePlanCredits } from "@/lib/autopilot/planner";
import type { Campaign } from "@/lib/autopilot/types";

/**
 * POST /api/autopilot/plan { campaignId, days? }
 * Generates an editable content queue for a campaign. Jobs are inserted with a
 * status that depends on the campaign mode:
 *   manual   → planned (you publish manually)
 *   assisted → awaiting_approval (you approve the queue)
 *   full     → scheduled (the cron auto-publishes at scheduled_time)
 * Returns the credit estimate vs balance so the UI can warn before generating.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId, days } = (await request.json().catch(() => ({}))) as { campaignId?: string; days?: number };
  if (!campaignId) return NextResponse.json({ error: "Missing campaignId." }, { status: 400 });

  const { data: c } = await supabase.from("autopilot_campaigns").select("*").eq("id", campaignId).eq("user_id", user.id).maybeSingle();
  if (!c) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const campaign = c as Campaign;
  const specs = generatePlan(campaign, Math.min(Math.max(days ?? 14, 1), 60));
  if (specs.length === 0) return NextResponse.json({ error: "Add at least one content type to the campaign first." }, { status: 400 });

  const statusForMode = campaign.mode === "full" ? "scheduled" : campaign.mode === "assisted" ? "awaiting_approval" : "planned";
  const estimate = estimatePlanCredits(specs);
  const balance = await getCreditBalance();

  // Idempotent: clear this campaign's not-yet-published jobs before re-planning,
  // so regenerating never creates duplicate content (published/failed are kept).
  await supabase.from("autopilot_jobs").delete()
    .eq("campaign_id", campaignId).eq("user_id", user.id)
    .in("status", ["planned", "queued", "scheduled", "awaiting_approval"]);

  const rows = specs.map((s) => ({
    user_id: user.id, campaign_id: campaignId, title: s.title, content_type: s.content_type,
    destination: s.destination, status: statusForMode, scheduled_time: s.scheduled_time,
    estimated_credits: s.estimated_credits,
  }));
  const { data: inserted, error } = await supabase.from("autopilot_jobs").insert(rows).select("id, title, content_type, destination, status, scheduled_time, estimated_credits");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("autopilot_history").insert({ user_id: user.id, campaign_id: campaignId, action: "generated", detail: `Planned ${specs.length} item(s) (${campaign.mode} mode).` });

  return NextResponse.json({
    jobs: inserted ?? [], estimatedCredits: estimate, balance,
    sufficient: balance >= estimate, mode: campaign.mode,
  });
}
