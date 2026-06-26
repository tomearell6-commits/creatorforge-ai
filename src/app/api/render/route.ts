import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadMedia } from "@/lib/media/storage";
import {
  isShotstackConfigured,
  buildTimeline,
  submitRender,
  getRenderStatus,
} from "@/lib/media/render/shotstack";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/constants";
import type { Scene } from "@/lib/types";

/**
 * Render queue.
 *  - With SHOTSTACK_API_KEY set: real rendering via Shotstack (submit + poll +
 *    store the finished MP4 in Storage).
 *  - Without it: the original placeholder (simulated progress, no real video).
 *
 * POST  /api/render            -> enqueue/submit a render for a project.
 * PATCH /api/render { id, action: "advance" | "retry" } -> step/refresh a job.
 */

// Gather the project's scenes (ordered) + latest voiceover, and submit to Shotstack.
async function submitProjectRender(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
): Promise<{ id: string } | { error: string; status: number }> {
  const { data: scenes } = await supabase
    .from("scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (!scenes || scenes.length === 0) {
    return { error: "Build scenes first (Scene Builder).", status: 400 };
  }

  const { data: voiceover } = await supabase
    .from("voiceovers")
    .select("audio_url")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasImage = (scenes as Scene[]).some((s) => !!s.image_url);
  if (!hasImage && !voiceover?.audio_url) {
    return {
      error: "Generate scene images and/or a voiceover before rendering.",
      status: 400,
    };
  }

  const spec = buildTimeline({ scenes: scenes as Scene[], voiceoverUrl: voiceover?.audio_url });
  const id = await submitRender(spec);
  return { id };
}

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

  // Placeholder mode (no Shotstack key) — keep the simulated queue.
  if (!isShotstackConfigured()) {
    const { data, error } = await supabase
      .from("render_jobs")
      .insert({
        user_id: user.id,
        project_id: projectId,
        status: "queued",
        progress: 0,
        estimated_seconds: 30,
        logs: "Job queued. (Placeholder render — set SHOTSTACK_API_KEY for real video.)",
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ job: data });
  }

  // Real render: check credits first.
  if ((await getCreditBalance()) < CREDIT_COSTS.render) {
    return NextResponse.json(
      { error: "Not enough credits to render. Upgrade your plan.", code: "insufficient_credits" },
      { status: 402 }
    );
  }

  let renderId: string;
  try {
    const result = await submitProjectRender(supabase, projectId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    renderId = result.id;
  } catch (err) {
    console.error("render submit failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Render failed to submit" }, { status: 502 });
  }

  await deductCredits(CREDIT_COSTS.render, "video_render");

  const { data, error } = await supabase
    .from("render_jobs")
    .insert({
      user_id: user.id,
      project_id: projectId,
      status: "processing",
      progress: 5,
      estimated_seconds: 60,
      provider_job_id: renderId,
      logs: `Submitted to Shotstack (${process.env.SHOTSTACK_ENV === "v1" ? "production" : "sandbox"}). Rendering…`,
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

  // ----- Retry -----
  if (action === "retry") {
    if (isShotstackConfigured() && job.project_id) {
      try {
        const result = await submitProjectRender(supabase, job.project_id);
        if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
        const { data } = await supabase
          .from("render_jobs")
          .update({
            status: "processing",
            progress: 5,
            error: null,
            provider_job_id: result.id,
            logs: "Resubmitted to Shotstack. Rendering…",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*")
          .single();
        return NextResponse.json({ job: data });
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "Retry failed" }, { status: 502 });
      }
    }
    const { data } = await supabase
      .from("render_jobs")
      .update({ status: "queued", progress: 0, error: null, logs: "Retrying…", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    return NextResponse.json({ job: data });
  }

  // ----- Advance / refresh -----
  // Placeholder job (no external id): simulate progress.
  if (!job.provider_job_id) {
    const progress = Math.min(100, (job.progress ?? 0) + 25);
    const status = progress >= 100 ? "done" : "processing";
    const { data } = await supabase
      .from("render_jobs")
      .update({
        progress,
        status,
        logs: `${job.logs}\n${progress >= 100 ? "Render complete (placeholder)." : `Rendering… ${progress}%`}`.trim(),
        output_url: progress >= 100 ? "placeholder://render/output.mp4" : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    return NextResponse.json({ job: data });
  }

  // Real job: query Shotstack.
  let st;
  try {
    st = await getRenderStatus(job.provider_job_id);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Status check failed" }, { status: 502 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if ((st.status === "done" || st.status === "completed") && st.url) {
    if (!job.output_url) {
      // Store our own durable copy of the MP4 + add it to the asset library.
      try {
        const upload = await uploadMedia(supabase, {
          userId: job.user_id,
          type: "video",
          bytes: Buffer.from(await (await fetch(st.url)).arrayBuffer()),
          contentType: "video/mp4",
          ext: "mp4",
        });
        await supabase.from("assets").insert({
          user_id: job.user_id,
          project_id: job.project_id,
          type: "video",
          name: "Rendered video",
          url: upload.url,
          mime_type: "video/mp4",
          size_bytes: upload.size,
          provider: "shotstack",
          metadata: { render_id: job.provider_job_id },
        });
        Object.assign(update, {
          status: "done",
          progress: 100,
          output_url: upload.url,
          logs: `${job.logs}\nRender complete — saved to your Asset Library.`.trim(),
        });
      } catch (err) {
        console.error("store rendered mp4 failed:", err);
        // Fall back to the Shotstack URL so the user still gets the video.
        Object.assign(update, { status: "done", progress: 100, output_url: st.url, logs: `${job.logs}\nRender complete.`.trim() });
      }
    } else {
      Object.assign(update, { status: "done", progress: 100 });
    }
  } else if (st.status === "failed") {
    Object.assign(update, { status: "failed", error: "Shotstack render failed", logs: `${job.logs}\nRender failed.`.trim() });
  } else if (st.status === "rendering" || st.status === "saving") {
    Object.assign(update, { status: "processing", progress: Math.max(job.progress ?? 0, 65) });
  } else {
    // queued / fetching / unknown
    Object.assign(update, { status: "processing", progress: Math.max(job.progress ?? 0, 20) });
  }

  const { data } = await supabase.from("render_jobs").update(update).eq("id", id).select("*").single();
  return NextResponse.json({ job: data });
}
