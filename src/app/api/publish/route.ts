import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executePost } from "@/lib/publishing/execute";
import type { PublishJob, PublishMode, ScheduledPost, SocialPlatform, Visibility } from "@/lib/types";

/**
 * Publishing Center (Phase 6 — Module 2).
 * GET  -> list the user's publish jobs (newest first).
 * POST -> create a publish job + a scheduled_post per platform. Mode:
 *           "now"      execute immediately via each platform provider,
 *           "schedule" store with scheduled_at,
 *           "draft"    store as draft.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("publish_jobs")
    .select("*, scheduled_posts(*), publish_history(*)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data ?? [] });
}

type Body = {
  projectId?: string;
  assetId?: string;
  videoUrl?: string;
  platforms: SocialPlatform[];
  title: string;
  description?: string;
  hashtags?: string[];
  tags?: string[];
  thumbnailUrl?: string;
  playlist?: string;
  category?: string;
  visibility?: Visibility;
  mode: PublishMode;
  scheduledAt?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Body;
  if (!body.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!body.platforms?.length) return NextResponse.json({ error: "Select at least one platform" }, { status: 400 });
  if (body.mode === "schedule" && !body.scheduledAt) {
    return NextResponse.json({ error: "Pick a date/time to schedule" }, { status: 400 });
  }

  // Normalize empty strings to null so they don't hit timestamp columns.
  const scheduledAt = body.scheduledAt?.trim() ? new Date(body.scheduledAt).toISOString() : null;

  const jobStatus = body.mode === "now" ? "publishing" : body.mode === "schedule" ? "scheduled" : "draft";

  const { data: job, error: jobErr } = await supabase
    .from("publish_jobs")
    .insert({
      user_id: user.id,
      project_id: body.projectId ?? null,
      asset_id: body.assetId ?? null,
      video_url: body.videoUrl ?? null,
      title: body.title.trim(),
      description: body.description ?? "",
      hashtags: body.hashtags ?? [],
      tags: body.tags ?? [],
      thumbnail_url: body.thumbnailUrl ?? null,
      playlist: body.playlist ?? null,
      category: body.category ?? null,
      visibility: body.visibility ?? "public",
      mode: body.mode,
      status: jobStatus,
      scheduled_at: scheduledAt,
    })
    .select("*")
    .single();
  if (jobErr || !job) return NextResponse.json({ error: jobErr?.message ?? "Failed to create job" }, { status: 500 });

  // One scheduled_post per selected platform, linked to the connected account.
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id, platform, external_id, account_name, account_handle, access_token, metadata")
    .in("platform", body.platforms)
    .eq("status", "connected");

  // For WordPress (blog) targets, publish the project's latest article/script.
  let articleHtml: string | null = null;
  if (body.platforms.includes("wordpress") && body.projectId) {
    const { data: script } = await supabase
      .from("generated_scripts")
      .select("content")
      .eq("project_id", body.projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    articleHtml = script?.content ?? null;
  }

  const postStatus = body.mode === "draft" ? "draft" : body.mode === "schedule" ? "scheduled" : "publishing";
  const rows = body.platforms.map((platform) => {
    const acc = accounts?.find((a) => a.platform === platform);
    return {
      user_id: user.id,
      publish_job_id: job.id,
      social_account_id: acc?.id ?? null,
      platform,
      scheduled_at: scheduledAt ?? new Date().toISOString(),
      status: postStatus,
    };
  });
  const { data: posts, error: postErr } = await supabase.from("scheduled_posts").insert(rows).select("*");
  if (postErr) return NextResponse.json({ error: postErr.message }, { status: 500 });

  // Mode "now": execute each target immediately.
  if (body.mode === "now" && posts) {
    let anyFailed = false;
    for (const post of posts as ScheduledPost[]) {
      const acc = accounts?.find((a) => a.platform === post.platform) ?? null;
      const r = await executePost(supabase, job as PublishJob, post, acc, articleHtml);
      if (r.status === "failed") anyFailed = true;
    }
    await supabase
      .from("publish_jobs")
      .update({ status: anyFailed ? "failed" : "published", updated_at: new Date().toISOString() })
      .eq("id", job.id);
  }

  const { data: full } = await supabase
    .from("publish_jobs")
    .select("*, scheduled_posts(*), publish_history(*)")
    .eq("id", job.id)
    .single();
  return NextResponse.json({ job: full });
}
