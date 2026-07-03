/**
 * Design Studio AI image generation — fal.ai FLUX.
 *
 * Turns the prompts produced by the concept generators (Design Studio,
 * Real Estate suite) into actual rendered images. Uses fal.ai's synchronous
 * endpoint (FLUX renders in seconds), then the caller rehosts the result to
 * Supabase Storage so it persists beyond fal's temporary URL.
 *
 * Model: FAL_IMAGE_MODEL env override; defaults to FLUX 1.1 Pro — the current
 * best quality/price for photorealistic architecture, interiors and product
 * imagery (~$0.04/image, within the 5-credit price).
 *
 * When FAL_KEY is missing, returns a free placeholder (picsum) so the flow
 * always works and never charges — consistent with every other generator.
 */
import { fetchWithTimeout } from "@/lib/http";

const SYNC = "https://fal.run";
const DEFAULT_MODEL = "fal-ai/flux-pro/v1.1";

function falKey(): string | undefined {
  return process.env.FAL_KEY || process.env.FAL_API_KEY;
}

export function willUseRealDesignImages(): boolean {
  return !!falKey();
}

export function falImageModel(): string {
  return process.env.FAL_IMAGE_MODEL || DEFAULT_MODEL;
}

/** Clamp requested dimensions to a FLUX-friendly size: longest side ≤ 1440,
 *  shortest ≥ 256, both rounded to multiples of 8, aspect ratio preserved. */
export function clampImageSize(width: number, height: number): { width: number; height: number } {
  let w = Math.max(1, width);
  let h = Math.max(1, height);
  const maxSide = 1440;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  w = w * scale;
  h = h * scale;
  const minScale = Math.max(1, 256 / Math.min(w, h));
  w = Math.round((w * minScale) / 8) * 8;
  h = Math.round((h * minScale) / 8) * 8;
  return { width: Math.max(256, w), height: Math.max(256, h) };
}

export type DesignImageResult = {
  /** Provider URL (temporary for fal; permanent for placeholder). */
  url: string;
  width: number;
  height: number;
  usedAI: boolean;
  model: string;
};

/** Generate one image. Throws on provider errors so the route can respond
 *  without charging; returns a placeholder when fal isn't configured. */
export async function generateDesignImage(
  prompt: string,
  size: { width: number; height: number }
): Promise<DesignImageResult> {
  const { width, height } = clampImageSize(size.width, size.height);

  if (!willUseRealDesignImages()) {
    // Deterministic free placeholder at the right aspect ratio.
    return {
      url: `https://picsum.photos/seed/${encodeURIComponent(prompt.slice(0, 24))}/${width}/${height}`,
      width, height, usedAI: false, model: "placeholder",
    };
  }

  const model = falImageModel();
  const res = await fetchWithTimeout(
    `${SYNC}/${model}`,
    {
      method: "POST",
      headers: { Authorization: `Key ${falKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        image_size: { width, height },
        num_images: 1,
        enable_safety_checker: true,
      }),
    },
    60_000
  );
  if (!res.ok) {
    throw new Error(`fal image error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const out = await res.json();
  // FLUX returns { images: [{ url, width, height }] }; cover common variants.
  const img = out?.images?.[0] ?? out?.image ?? null;
  const url: string | null = img?.url ?? out?.url ?? null;
  if (!url) throw new Error("fal image response had no image URL");
  return { url, width: img?.width ?? width, height: img?.height ?? height, usedAI: true, model };
}
