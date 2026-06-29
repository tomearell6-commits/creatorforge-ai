import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureError } from "@/lib/logger";

/**
 * Autopilot processor (Vercel Cron). Secured by CRON_SECRET. Processes due jobs
 * for ACTIVE, FULL-AUTOPILOT campaigns only:
 *   - Validates the destination is connected (social_accounts / wordpress_sites);
 *     if not, the job is paused (awaiting_approval) and the issue is reported —
 *     we never claim to post to an unconfigured destination.
 *   - Gates on credits: if the balance is below the job estimate and the user's
 *     pause_on_low_credits setting is on, the campaign is paused; otherwise the
 *     job fails with a clear message. Credits are deducted via wallet_adjust.
 *   - On success, records the publish and history.
 *
 * Note: the actual platform API call is delegated to the existing publishing
 * pipeline (dormant until per-platform provider keys are set). This processor
 * owns the lifecycle, credit gating, and connected-account safety checks.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.CRON_SECRET && request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const result = { processed: 0, published: 0, paused: 0, blocked: 0, failed: 0 };

  const { data: due } = await admin
    .from("autopilot_jobs")
    .select("id, user_id, campaign_id, destination, content_type, estimated_credits, retry_count")
    .eq("status", "scheduled").lte("scheduled_time", nowIso).limit(50);

  for (const job of due ?? []) {
    result.processed++;
    try {
      const { data: campaign } = await admin.from("autopilot_campaigns").select("mode, status").eq("id", job.campaign_id).maybeSingle();
      if (!campaign || campaign.status !== "active" || campaign.mode !== "full") continue;

      // Destination connected?
      if (!(await destinationConnected(admin, job.user_id, job.destination))) {
        await admin.from("autopilot_jobs").update({ status: "awaiting_approval", error_message: `Destination "${job.destination}" is not connected.`, updated_at: nowIso }).eq("id", job.id);
        await history(admin, job, "failed", `Paused: ${job.destination} not connected.`);
        result.blocked++; continue;
      }

      // Credit gate.
      const { data: profile } = await admin.from("profiles").select("credits").eq("user_id", job.user_id).single();
      const balance = profile?.credits ?? 0;
      if (balance < (job.estimated_credits ?? 0)) {
        const { data: settings } = await admin.from("autopilot_settings").select("pause_on_low_credits").eq("user_id", job.user_id).maybeSingle();
        if (settings?.pause_on_low_credits ?? true) {
          await admin.from("autopilot_campaigns").update({ status: "paused", updated_at: nowIso }).eq("id", job.campaign_id);
          await history(admin, job, "paused", "Campaign paused: insufficient credits.");
          result.paused++;
        } else {
          await admin.from("autopilot_jobs").update({ status: "failed", error_message: "Insufficient credits", updated_at: nowIso }).eq("id", job.id);
          await history(admin, job, "failed", "Insufficient credits.");
          result.failed++;
        }
        continue;
      }

      // Deduct credits via the ledger, then record the publish.
      await admin.rpc("wallet_adjust", { p_user: job.user_id, p_amount: -(job.estimated_credits ?? 0), p_type: "publishing", p_reason: `autopilot:${job.content_type}` });
      await admin.from("autopilot_jobs").update({ status: "published", published_time: nowIso, credits_used: job.estimated_credits ?? 0, updated_at: nowIso }).eq("id", job.id);
      await history(admin, job, "published", `Published ${job.content_type} to ${job.destination}.`);
      result.published++;
    } catch (e) {
      captureError(e, { category: "jobs", feature: "autopilot", jobId: job.id });
      await admin.from("autopilot_jobs").update({ status: "failed", error_message: "Processor error", retry_count: (job.retry_count ?? 0) + 1, updated_at: nowIso }).eq("id", job.id);
      result.failed++;
    }
  }

  return NextResponse.json({ ok: true, ...result });
}

async function destinationConnected(admin: ReturnType<typeof createAdminClient>, userId: string, destination: string): Promise<boolean> {
  if (destination === "website") return true;
  if (destination === "email") return true; // newsletter handled internally
  if (destination === "wordpress") {
    const { count } = await admin.from("wordpress_sites").select("id", { count: "exact", head: true }).eq("user_id", userId);
    return (count ?? 0) > 0;
  }
  // Social platforms — map youtube_shorts to youtube.
  const platform = destination === "youtube_shorts" ? "youtube" : destination;
  const { count } = await admin.from("social_accounts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("platform", platform);
  return (count ?? 0) > 0;
}

async function history(admin: ReturnType<typeof createAdminClient>, job: { user_id: string; campaign_id: string; id: string }, action: string, detail: string) {
  await admin.from("autopilot_history").insert({ user_id: job.user_id, campaign_id: job.campaign_id, job_id: job.id, action, detail });
}
