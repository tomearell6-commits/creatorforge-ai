import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executePost } from "@/lib/publishing/execute";
import type { PublishJob, ScheduledPost } from "@/lib/types";

/**
 * Act on a publish job (Phase 6 — Module 2).
 * PATCH { action: "publish" | "retry" } -> run/re-run all of the job's targets.
 * DELETE -> remove the job (cascades to scheduled_posts / history).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await request.json();
  if (action !== "publish" && action !== "retry") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const { data: job } = await supabase.from("publish_jobs").select("*").eq("id", id).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: posts } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("publish_job_id", id);
  if (!posts?.length) return NextResponse.json({ error: "No targets to publish" }, { status: 400 });

  const platforms = posts.map((p) => p.platform);
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id, platform, external_id, account_name, account_handle, access_token, metadata")
    .in("platform", platforms)
    .eq("status", "connected");

  let articleHtml: string | null = null;
  if (platforms.includes("wordpress") && job.project_id) {
    const { data: script } = await supabase
      .from("generated_scripts")
      .select("content")
      .eq("project_id", job.project_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    articleHtml = script?.content ?? null;
  }

  let anyFailed = false;
  for (const post of posts as ScheduledPost[]) {
    if (action === "retry" && post.status === "published") continue;
    const acc = accounts?.find((a) => a.platform === post.platform) ?? null;
    const r = await executePost(supabase, job as PublishJob, post, acc, articleHtml);
    if (r.status === "failed") anyFailed = true;
  }
  await supabase
    .from("publish_jobs")
    .update({ status: anyFailed ? "failed" : "published", updated_at: new Date().toISOString() })
    .eq("id", id);

  const { data: full } = await supabase
    .from("publish_jobs")
    .select("*, scheduled_posts(*), publish_history(*)")
    .eq("id", id)
    .single();
  return NextResponse.json({ job: full });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("publish_jobs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
