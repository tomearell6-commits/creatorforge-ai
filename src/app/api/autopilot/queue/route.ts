import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/autopilot/queue?campaignId= — jobs (optionally filtered by campaign). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = new URL(request.url).searchParams.get("campaignId");
  let q = supabase.from("autopilot_jobs")
    .select("id, campaign_id, title, content_type, destination, status, scheduled_time, published_time, credits_used, estimated_credits, error_message, retry_count")
    .eq("user_id", user.id).order("scheduled_time", { ascending: true }).limit(200);
  if (campaignId) q = q.eq("campaign_id", campaignId);
  const { data } = await q;
  return NextResponse.json({ jobs: data ?? [] });
}

/**
 * POST /api/autopilot/queue { jobId, action, scheduledTime? }
 *   action: reschedule | retry | approve | cancel
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as { jobId?: string; action?: string; scheduledTime?: string };
  if (!b.jobId || !b.action) return NextResponse.json({ error: "Missing jobId/action." }, { status: 400 });

  const { data: job } = await supabase.from("autopilot_jobs").select("id, status, campaign_id").eq("id", b.jobId).eq("user_id", user.id).maybeSingle();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let historyAction = "";
  switch (b.action) {
    case "reschedule":
      if (!b.scheduledTime) return NextResponse.json({ error: "Missing scheduledTime." }, { status: 400 });
      patch.scheduled_time = new Date(b.scheduledTime).toISOString();
      historyAction = "scheduled";
      break;
    case "retry":
      patch.status = "scheduled"; patch.error_message = null;
      historyAction = "scheduled";
      break;
    case "approve":
      patch.status = "scheduled"; // assisted → approved for publishing
      historyAction = "approved";
      break;
    case "cancel":
      patch.status = "failed"; patch.error_message = "Cancelled by user";
      historyAction = "failed";
      break;
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { error } = await supabase.from("autopilot_jobs").update(patch).eq("id", b.jobId).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.from("autopilot_history").insert({ user_id: user.id, campaign_id: job.campaign_id, job_id: b.jobId, action: historyAction, detail: `Queue action: ${b.action}` });
  return NextResponse.json({ ok: true });
}
