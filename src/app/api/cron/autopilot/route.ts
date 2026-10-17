import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureError } from "@/lib/logger";

/**
 * Autopilot processor (Vercel Cron). Secured by CRON_SECRET. Looks at due jobs for
 * ACTIVE, FULL-AUTOPILOT campaigns.
 *
 * HONESTY FIX (2026-10): this processor used to mark every due job "published" and
 * deduct credits even though nothing generated or posted the content (the real
 * per-platform publishers are not wired into Autopilot). That could charge a user
 * for work that never happened. It now NEVER claims a publish and NEVER charges:
 * a due job whose destination is not connected is reported as blocked, and every
 * other due job is held for manual approval with a clear message. Real automated
 * daily blog posting lives in the SEO Auto-Poster (see /api/cron/seo-autopost).
 */
export const dynamic = "force-dynamic";

const NOT_WIRED_MESSAGE =
  "Automatic posting for this content type is not available in Autopilot yet. Nothing was posted and no credits were charged. Approve the job to publish it manually, or use SEO Auto-Poster for automatic daily blog posts.";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const result = { processed: 0, held: 0, blocked: 0, failed: 0 };

  const { data: due } = await admin
    .from("autopilot_jobs")
    .select("id, user_id, campaign_id, destination, content_type")
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

      // Nothing here can generate or publish content yet — hold the job honestly.
      await admin.from("autopilot_jobs").update({ status: "awaiting_approval", error_message: NOT_WIRED_MESSAGE, updated_at: nowIso }).eq("id", job.id);
      await history(admin, job, "paused", NOT_WIRED_MESSAGE);
      result.held++;
    } catch (e) {
      captureError(e, { category: "jobs", feature: "autopilot", jobId: job.id });
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
