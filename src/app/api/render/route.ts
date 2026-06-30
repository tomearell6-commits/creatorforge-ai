import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadMedia } from "@/lib/media/storage";
import {
  isShotstackConfigured,
  buildTimeline,
  submitRender,
  getRenderStatus,
} from "@/lib/media/render/shotstack";
import { submitClip, pollClip, isFalConfigured } from "@/lib/media/providers/fal";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { renderTier } from "@/lib/constants";
import { emitNotification } from "@/lib/notifications";
import { logEvent } from "@/lib/analytics";
import { runTrigger } from "@/lib/automation/engine";
import { captureError } from "@/lib/logger";
import type { Scene } from "@/lib/types";

/**
 * Render queue. Two render families:
 *  - Slideshow (free tier): images + Ken Burns motion → Shotstack → MP4.
 *  - AI Video (ai_standard|ai_pro|ai_cinematic): generate a fal.ai clip per scene,
 *    then assemble the clips + voiceover + captions via Shotstack → MP4.
 *
 * AI Video is a two-stage async flow tracked on render_jobs.metadata.stage:
 *   generating_clips → assembling → done.
 *
 * POST  /api/render { projectId, mode? }
 * PATCH /api/render { id, action: "advance" | "retry" }
 */

type SB = Awaited<ReturnType<typeof createClient>>;

async function getScenes(supabase: SB, projectId: string) {
  const { data } = await supabase.from("scenes").select("*").eq("project_id", projectId).order("position", { ascending: true });
  return (data ?? []) as Scene[];
}
async function getVoiceoverUrl(supabase: SB, projectId: string) {
  const { data } = await supabase
    .from("voiceovers").select("audio_url").eq("project_id", projectId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data?.audio_url as string | undefined;
}
async function isFreePlan(supabase: SB, userId: string) {
  const { data } = await supabase.from("profiles").select("plan").eq("user_id", userId).maybeSingle();
  return (data?.plan ?? "free") === "free";
}
function scenePrompt(s: Scene) {
  return (s.video_prompt || s.visual_description || s.image_prompt || s.text || "").trim();
}

// Slideshow: assemble images immediately and submit to Shotstack.
async function submitSlideshow(supabase: SB, projectId: string, brand: boolean): Promise<{ id: string } | { error: string; status: number }> {
  const scenes = await getScenes(supabase, projectId);
  if (scenes.length === 0) return { error: "Build scenes first (Scene Builder).", status: 400 };
  const voiceoverUrl = await getVoiceoverUrl(supabase, projectId);
  if (!scenes.some((s) => s.image_url) && !voiceoverUrl) {
    return { error: "Generate scene images and/or a voiceover before rendering.", status: 400 };
  }
  const id = await submitRender(buildTimeline({ scenes, voiceoverUrl, brand }));
  return { id };
}

// AI Video: submit one fal clip per scene; returns the poll handles.
async function submitAiClips(supabase: SB, projectId: string, model: string): Promise<
  { jobs: { position: number; statusUrl: string; responseUrl: string }[] } | { error: string; status: number }
> {
  const scenes = await getScenes(supabase, projectId);
  if (scenes.length === 0) return { error: "Build scenes first (Scene Builder).", status: 400 };
  const withPrompts = scenes.filter((s) => scenePrompt(s));
  if (withPrompts.length === 0) return { error: "Scenes need visual prompts — rebuild scenes from the script.", status: 400 };

  const jobs: { position: number; statusUrl: string; responseUrl: string }[] = [];
  for (const s of withPrompts) {
    const sub = await submitClip({ prompt: scenePrompt(s) }, model);
    jobs.push({ position: s.position ?? jobs.length, statusUrl: sub.statusUrl, responseUrl: sub.responseUrl });
  }
  return { jobs };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, mode } = await request.json();
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  const tier = renderTier(mode);

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Placeholder mode (no Shotstack key) — simulated queue (slideshow only).
  if (!isShotstackConfigured()) {
    const { data, error } = await supabase.from("render_jobs").insert({
      user_id: user.id, project_id: projectId, status: "queued", progress: 0, estimated_seconds: 30,
      mode: "slideshow", logs: "Job queued. (Placeholder render — set SHOTSTACK_API_KEY for real video.)",
    }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ job: data });
  }

  // Free Trial: AI Video tiers are a paid (professional) feature. Slideshow stays free.
  if (tier.model && (await isFreePlan(supabase, user.id))) {
    return NextResponse.json({
      error: "AI Video rendering is a paid feature. The Free Trial includes Slideshow renders — upgrade to a paid plan to use the Standard, Pro, and Cinematic AI Video tiers.",
      code: "upgrade_required",
    }, { status: 403 });
  }

  // Credits (per tier).
  if ((await getCreditBalance()) < tier.credits) {
    return NextResponse.json({ error: `Not enough credits (${tier.label} costs ${tier.credits}). Upgrade your plan.`, code: "insufficient_credits" }, { status: 402 });
  }

  // ----- AI Video tiers -----
  if (tier.model) {
    if (!isFalConfigured()) {
      return NextResponse.json({ error: "AI Video isn't enabled on this server (missing FAL_KEY)." }, { status: 501 });
    }
    let jobs;
    try {
      const result = await submitAiClips(supabase, projectId, tier.model);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      jobs = result.jobs;
    } catch (err) {
      captureError(err, { category: "rendering", route: "POST /api/render (ai)", tier: tier.id });
      return NextResponse.json({ error: err instanceof Error ? err.message : "AI clip submission failed" }, { status: 502 });
    }
    await deductCredits(tier.credits, `video_render_${tier.id}`);
    const { data, error } = await supabase.from("render_jobs").insert({
      user_id: user.id, project_id: projectId, status: "processing", progress: 5, estimated_seconds: 60 * 20,
      mode: tier.id,
      metadata: { stage: "generating_clips", model: tier.model, fal: jobs },
      logs: `Generating ${jobs.length} AI clip(s) with ${tier.label}… this takes several minutes.`,
    }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ job: data });
  }

  // ----- Slideshow tier -----
  let renderId: string;
  try {
    const result = await submitSlideshow(supabase, projectId, await isFreePlan(supabase, user.id));
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    renderId = result.id;
  } catch (err) {
    captureError(err, { category: "rendering", route: "POST /api/render", projectId });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Render failed to submit" }, { status: 502 });
  }
  await deductCredits(tier.credits, "video_render");
  const { data, error } = await supabase.from("render_jobs").insert({
    user_id: user.id, project_id: projectId, status: "processing", progress: 5, estimated_seconds: 60,
    mode: "slideshow", provider_job_id: renderId,
    logs: `Submitted to Shotstack (${process.env.SHOTSTACK_ENV === "v1" ? "production" : "sandbox"}). Rendering…`,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, action } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data: job } = await supabase.from("render_jobs").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const meta = (job.metadata ?? {}) as { stage?: string; model?: string; fal?: { position: number; statusUrl: string; responseUrl: string }[]; clips?: (string | null)[] };

  // ----- Retry (slideshow only; AI Video re-render = new job) -----
  if (action === "retry") {
    if (isShotstackConfigured() && job.project_id && (!job.mode || job.mode === "slideshow")) {
      try {
        const result = await submitSlideshow(supabase, job.project_id, await isFreePlan(supabase, user.id));
        if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
        const { data } = await supabase.from("render_jobs").update({
          status: "processing", progress: 5, error: null, provider_job_id: result.id,
          logs: "Resubmitted to Shotstack. Rendering…", updated_at: new Date().toISOString(),
        }).eq("id", id).select("*").single();
        return NextResponse.json({ job: data });
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "Retry failed" }, { status: 502 });
      }
    }
    const { data } = await supabase.from("render_jobs").update({ status: "queued", progress: 0, error: null, logs: "Retrying…", updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
    return NextResponse.json({ job: data });
  }

  // ----- AI Video: clip-generation stage -----
  if (meta.stage === "generating_clips" && meta.fal?.length) {
    try {
      const results = await Promise.all(meta.fal.map((f) => pollClip(f.statusUrl, f.responseUrl).then((r) => ({ ...f, ...r })).catch(() => ({ ...f, status: "ERROR", url: null }))));
      const done = results.filter((r) => r.status === "COMPLETED");
      const failed = results.filter((r) => r.status === "ERROR");
      if (failed.length) {
        const { data } = await supabase.from("render_jobs").update({ status: "failed", error: "An AI clip failed to generate.", updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
        return NextResponse.json({ job: data });
      }
      if (done.length < results.length) {
        const progress = 5 + Math.round((done.length / results.length) * 60); // 5→65% across clip gen
        const { data } = await supabase.from("render_jobs").update({ progress, logs: `${job.logs}\nClips ready: ${done.length}/${results.length}`.trim(), updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
        return NextResponse.json({ job: data });
      }
      // All clips done → assemble with Shotstack.
      const clipsByPos = new Map(results.map((r) => [r.position, r.url]));
      const scenes = await getScenes(supabase, job.project_id);
      const clipUrls = scenes.map((s) => clipsByPos.get(s.position ?? -1) ?? null);
      const voiceoverUrl = await getVoiceoverUrl(supabase, job.project_id);
      const renderId = await submitRender(buildTimeline({ scenes, voiceoverUrl, clipUrls, brand: await isFreePlan(supabase, user.id) }));
      const { data } = await supabase.from("render_jobs").update({
        provider_job_id: renderId, progress: 70,
        metadata: { ...meta, stage: "assembling", clips: clipUrls },
        logs: `${job.logs}\nAll clips ready — assembling final video…`.trim(), updated_at: new Date().toISOString(),
      }).eq("id", id).select("*").single();
      return NextResponse.json({ job: data });
    } catch (err) {
      captureError(err, { category: "rendering", step: "ai_clip_poll", jobId: job.id });
      return NextResponse.json({ error: err instanceof Error ? err.message : "Clip polling failed" }, { status: 502 });
    }
  }

  // ----- Placeholder job (no external id, slideshow) -----
  if (!job.provider_job_id) {
    const progress = Math.min(100, (job.progress ?? 0) + 25);
    const status = progress >= 100 ? "done" : "processing";
    const { data } = await supabase.from("render_jobs").update({
      progress, status,
      logs: `${job.logs}\n${progress >= 100 ? "Render complete (placeholder)." : `Rendering… ${progress}%`}`.trim(),
      output_url: progress >= 100 ? "placeholder://render/output.mp4" : null, updated_at: new Date().toISOString(),
    }).eq("id", id).select("*").single();
    return NextResponse.json({ job: data });
  }

  // ----- Shotstack assembly polling (slideshow + AI assembling stage) -----
  let st;
  try {
    st = await getRenderStatus(job.provider_job_id);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Status check failed" }, { status: 502 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ((st.status === "done" || st.status === "completed") && st.url) {
    if (!job.output_url) {
      try {
        const upload = await uploadMedia(supabase, { userId: job.user_id, type: "video", bytes: Buffer.from(await (await fetch(st.url)).arrayBuffer()), contentType: "video/mp4", ext: "mp4" });
        await supabase.from("assets").insert({
          user_id: job.user_id, project_id: job.project_id, type: "video", name: "Rendered video",
          url: upload.url, mime_type: "video/mp4", size_bytes: upload.size, provider: job.mode === "slideshow" ? "shotstack" : `fal+shotstack`,
          metadata: { render_id: job.provider_job_id, mode: job.mode },
        });
        Object.assign(update, { status: "done", progress: 100, output_url: upload.url, logs: `${job.logs}\nRender complete — saved to your Asset Library.`.trim() });
      } catch (err) {
        captureError(err, { category: "rendering", step: "store_mp4", jobId: job.id });
        Object.assign(update, { status: "done", progress: 100, output_url: st.url, logs: `${job.logs}\nRender complete.`.trim() });
      }
    } else {
      Object.assign(update, { status: "done", progress: 100 });
    }
  } else if (st.status === "failed") {
    Object.assign(update, { status: "failed", error: "Shotstack render failed", logs: `${job.logs}\nRender failed.`.trim() });
  } else if (st.status === "rendering" || st.status === "saving") {
    Object.assign(update, { status: "processing", progress: Math.max(job.progress ?? 0, 80) });
  } else {
    Object.assign(update, { status: "processing", progress: Math.max(job.progress ?? 0, 72) });
  }

  const { data } = await supabase.from("render_jobs").update(update).eq("id", id).select("*").single();

  if (update.status === "done" && !job.output_url) {
    await emitNotification(supabase, { userId: job.user_id, type: "render_complete", title: "Your video is ready", body: "Render complete — saved to your Asset Library.", link: "/dashboard/render", metadata: { job_id: job.id } });
    await logEvent(supabase, { userId: job.user_id, eventType: "render", projectId: job.project_id });
    await runTrigger(supabase, job.user_id, "render_complete", { title: "Your video finished rendering.", link: "/dashboard/render" });
  }

  return NextResponse.json({ job: data });
}
