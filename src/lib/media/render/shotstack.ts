/**
 * Shotstack video rendering (Phase 4 — final render pipeline).
 *
 * Rendering can't run inside a Vercel request (too heavy), so we offload it to
 * Shotstack: assemble a timeline from the project's scenes (images + captions)
 * and voiceover, submit it, then poll the render status (handled by the render
 * route). On completion the route stores the finished MP4 in Supabase Storage.
 *
 * Env: SHOTSTACK_API_KEY (required to enable), SHOTSTACK_ENV = "stage" (default,
 * sandbox) | "v1" (production).
 */

import type { Scene } from "@/lib/types";

const ENV = process.env.SHOTSTACK_ENV === "v1" ? "v1" : "stage";
const BASE = `https://api.shotstack.io/edit/${ENV}`;

export function isShotstackConfigured(): boolean {
  return !!process.env.SHOTSTACK_API_KEY;
}

type Clip = Record<string, unknown>;

/**
 * A CreatorForge brand watermark overlay (HTML asset) for the whole timeline.
 * Applied to free-plan renders so unpaid videos carry the brand; paid plans
 * render clean. Sits on the top-most track, bottom-right corner.
 */
function brandWatermarkClip(totalLength: number): Clip {
  return {
    asset: {
      type: "html",
      html: "<div class='cf'><span class='dot'>&#9650;</span>CreatorForge&nbsp;AI</div>",
      css:
        ".cf{ display:flex; align-items:center; gap:8px; color:#ffffff; " +
        "font-family:'Open Sans',sans-serif; font-size:22px; font-weight:700; " +
        "text-shadow:0 1px 4px rgba(0,0,0,0.55); white-space:nowrap; } " +
        ".dot{ color:#7c3aed; font-size:18px; }",
      width: 320,
      height: 44,
      background: "transparent",
    },
    start: 0,
    length: totalLength,
    position: "bottomRight",
    offset: { x: -0.02, y: 0.04 },
    opacity: 0.9,
  };
}

/** Build a Shotstack timeline from ordered scenes + an optional voiceover URL. */
export function buildTimeline(opts: {
  scenes: Scene[];
  voiceoverUrl?: string | null;
  brand?: boolean;
  /** AI Video mode: per-scene generated clip URLs (aligned to scenes by index). */
  clipUrls?: (string | null)[] | null;
}) {
  const { scenes, voiceoverUrl, brand, clipUrls } = opts;
  const imageClips: Clip[] = [];
  const captionClips: Clip[] = [];
  let t = 0;

  // Alternate Ken Burns moves so the slideshow feels dynamic instead of a static zoom.
  const motions = ["zoomIn", "slideLeft", "zoomOut", "slideRight", "zoomIn", "slideUp"];

  scenes.forEach((s, i) => {
    const len = Math.max(2, Number(s.duration) || 4);
    const clip = clipUrls?.[i];
    if (clip) {
      // AI Video: use the generated moving footage (already animated → no effect).
      imageClips.push({
        asset: { type: "video", src: clip, volume: 0 },
        start: Number(t.toFixed(2)),
        length: len,
        fit: "cover",
        transition: { in: i === 0 ? "fade" : "fade", out: "fade" },
      });
    } else if (s.image_url) {
      imageClips.push({
        asset: { type: "image", src: s.image_url },
        start: Number(t.toFixed(2)),
        length: len,
        effect: motions[i % motions.length],
        transition: { in: i === 0 ? "fade" : "slideLeft", out: "fade" },
      });
    }
    const caption = (s.text || "").trim().replace(/\s+/g, " ").slice(0, 120);
    if (caption) {
      captionClips.push({
        asset: { type: "title", text: caption, style: "subtitle", size: "small", position: "bottom" },
        start: Number(t.toFixed(2)),
        length: len,
        transition: { in: "fade", out: "fade" },
      });
    }
    t += len;
  });

  const totalLength = Math.max(t, 1);
  const tracks: { clips: Clip[] }[] = [];
  // First track renders on top. Brand watermark sits above everything (free plan).
  if (brand) tracks.push({ clips: [brandWatermarkClip(totalLength)] });
  if (captionClips.length) tracks.push({ clips: captionClips });
  if (imageClips.length) tracks.push({ clips: imageClips });
  if (voiceoverUrl) {
    tracks.push({ clips: [{ asset: { type: "audio", src: voiceoverUrl, volume: 1 }, start: 0, length: totalLength }] });
  }

  return {
    timeline: { background: "#000000", tracks },
    output: { format: "mp4", size: { width: 1280, height: 720 }, fps: 25 },
  };
}

/** Submit a render; returns the Shotstack render id. */
export async function submitRender(spec: unknown): Promise<string> {
  const apiKey = process.env.SHOTSTACK_API_KEY;
  if (!apiKey) throw new Error("SHOTSTACK_API_KEY is not set");

  const res = await fetch(`${BASE}/render`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(spec),
  });
  if (!res.ok) throw new Error(`Shotstack render error ${res.status}: ${await res.text()}`);

  const json = (await res.json()) as { response?: { id?: string } };
  const id = json.response?.id;
  if (!id) throw new Error("Shotstack returned no render id");
  return id;
}

export type ShotstackStatus = {
  status: string; // queued | fetching | rendering | saving | done/completed | failed
  url: string | null;
};

/** Poll a render's status. `url` is populated when complete. */
export async function getRenderStatus(id: string): Promise<ShotstackStatus> {
  const apiKey = process.env.SHOTSTACK_API_KEY;
  if (!apiKey) throw new Error("SHOTSTACK_API_KEY is not set");

  const res = await fetch(`${BASE}/render/${id}`, { headers: { "x-api-key": apiKey } });
  if (!res.ok) throw new Error(`Shotstack status error ${res.status}`);

  const json = (await res.json()) as { response?: { status?: string; url?: string } };
  return { status: json.response?.status ?? "unknown", url: json.response?.url ?? null };
}
