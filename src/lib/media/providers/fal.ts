/**
 * fal.ai video provider (real AI text-to-video / image-to-video).
 *
 * fal.ai is a model aggregator: one key (FAL_KEY) gives access to many video
 * models (MiniMax/Hailuo, Kling, Veo, Luma, …) selected by model id
 * (FAL_VIDEO_MODEL). Generation is asynchronous (≈1–5 min/clip) via fal's queue:
 *   submit → poll status → fetch result (video.url).
 *
 * Cost note: AI video is 10–100× the image slideshow. Meter it as a premium
 * render mode with repriced credits (see docs/AI-VIDEO.md).
 */
import type { VideoProvider, VideoGenInput, VideoGenResult } from "../types";

const QUEUE = "https://queue.fal.run";

/** Default model — cheap text-to-video for testing. Override with FAL_VIDEO_MODEL. */
function model(input: VideoGenInput): string {
  if (process.env.FAL_VIDEO_MODEL) return process.env.FAL_VIDEO_MODEL;
  // image-to-video (consistency) when a first frame is supplied, else text-to-video.
  return input.imageUrl ? "fal-ai/kling-video/v1/standard/image-to-video" : "fal-ai/minimax/video-01";
}

export function isFalConfigured(): boolean {
  return !!process.env.FAL_KEY;
}

function authHeader() {
  return { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" };
}

/** Submit a clip job; returns the queue handles to poll. `modelId` overrides the default. */
export async function submitClip(input: VideoGenInput, modelId?: string): Promise<{ requestId: string; statusUrl: string; responseUrl: string; model: string }> {
  if (!isFalConfigured()) throw new Error("FAL_KEY is not set");
  const m = modelId || model(input);
  const body: Record<string, unknown> = { prompt: input.prompt };
  if (input.imageUrl) body.image_url = input.imageUrl;
  if (input.durationSeconds) body.duration = input.durationSeconds;

  const res = await fetch(`${QUEUE}/${m}`, { method: "POST", headers: authHeader(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`fal submit error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return { requestId: j.request_id, statusUrl: j.status_url, responseUrl: j.response_url, model: m };
}

/** Poll a submitted clip. Returns { status, url } — url is set when COMPLETED. */
export async function pollClip(statusUrl: string, responseUrl: string): Promise<{ status: string; url: string | null }> {
  const st = await fetch(statusUrl, { headers: authHeader() });
  if (!st.ok) throw new Error(`fal status error ${st.status}`);
  const status = (await st.json()).status as string; // IN_QUEUE | IN_PROGRESS | COMPLETED
  if (status !== "COMPLETED") return { status, url: null };

  const res = await fetch(responseUrl, { headers: authHeader() });
  if (!res.ok) throw new Error(`fal result error ${res.status}`);
  const out = await res.json();
  // Different models nest the url differently; cover the common shapes.
  const url: string | null = out?.video?.url ?? out?.video_url ?? out?.output?.[0] ?? out?.url ?? null;
  return { status: "COMPLETED", url };
}

const falVideoProvider: VideoProvider = {
  id: "fal",
  name: "fal.ai AI video",
  /** Blocking generate (submit + poll until done). For the queue-driven render
   *  pipeline use submitClip/pollClip directly instead. */
  async generate(input: VideoGenInput): Promise<VideoGenResult> {
    const { statusUrl, responseUrl } = await submitClip(input);
    // Poll up to ~6 minutes.
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 6000));
      const { status, url } = await pollClip(statusUrl, responseUrl);
      if (status === "COMPLETED") return { url, status: url ? "ready" : "failed", provider: "fal" };
    }
    return { url: null, status: "processing", provider: "fal" };
  },
};

export { falVideoProvider };
