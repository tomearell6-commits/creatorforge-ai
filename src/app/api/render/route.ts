import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Render queue — PLACEHOLDER. No real rendering happens in Phase 3; jobs
 * simulate progress so the queue UI is exercisable end-to-end.
 *
 * POST  /api/render -> enqueue a render job for a project.
 * PATCH /api/render -> { id, action: "advance" | "retry" } to step a job.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await request.json();
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("render_jobs")
    .insert({
      user_id: user.id,
      project_id: projectId,
      status: "queued",
      progress: 0,
      estimated_seconds: 30,
      logs: "Job queued. (Placeholder render — no final video is produced yet.)",
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ job: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, action } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data: job } = await supabase
    .from("render_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  let update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (action === "retry") {
    update = { ...update, status: "queued", progress: 0, error: null, logs: "Retrying…" };
  } else {
    // "advance": simulate the next step of a placeholder render.
    const progress = Math.min(100, (job.progress ?? 0) + 25);
    const status = progress >= 100 ? "done" : "processing";
    const logLine =
      progress >= 100
        ? "Render complete (placeholder output)."
        : `Rendering… ${progress}%`;
    update = {
      ...update,
      progress,
      status,
      logs: `${job.logs}\n${logLine}`.trim(),
      output_url: progress >= 100 ? "placeholder://render/output.mp4" : null,
    };
  }

  const { data, error } = await supabase
    .from("render_jobs")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ job: data });
}
