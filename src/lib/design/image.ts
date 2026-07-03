/**
 * Design Studio AI image generation — fal.ai FLUX.
 *
 * Turns the prompts produced by the concept generators (Design Studio,
 * Real Estate suite) into actual rendered images. Uses fal.ai's synchronous
 * endpoint (FLUX renders in seconds), then the caller rehosts the result to
 * Supabase Storage so it persists beyond fal's temporary URL.
 *
 * Model: FAL_IMAGE_MODEL env override; defaults to FLUX 1.1 Pro ULTRA — the
 * top-quality tier (2K resolution, finest architectural/interior detail,
 * ~$0.06/image, within the 8-credit price). Ultra takes an `aspect_ratio`
 * instead of pixel dimensions; non-ultra models take `image_size` — both are
 * handled below so the model can be swapped freely via env.
 *
 * When FAL_KEY is missing, returns a free placeholder (picsum) so the flow
 * always works and never charges — consistent with every other generator.
 */
import { fetchWithTimeout } from "@/lib/http";

const SYNC = "https://fal.run";
const DEFAULT_MODEL = "fal-ai/flux-pro/v1.1-ultra";

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

/** Ultra models size by aspect ratio, not pixels. Map any requested WxH to the
 *  nearest ratio Ultra supports. Exported for tests. */
export function nearestUltraRatio(width: number, height: number): string {
  const supported: [string, number][] = [
    ["21:9", 21 / 9], ["16:9", 16 / 9], ["3:2", 3 / 2], ["4:3", 4 / 3], ["1:1", 1],
    ["3:4", 3 / 4], ["2:3", 2 / 3], ["9:16", 9 / 16], ["9:21", 9 / 21],
  ];
  const target = width / height;
  let best = supported[0];
  for (const s of supported) {
    if (Math.abs(s[1] - target) < Math.abs(best[1] - target)) best = s;
  }
  return best[0];
}

function isUltraModel(model: string): boolean {
  return /ultra/i.test(model);
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
  const body: Record<string, unknown> = { prompt, num_images: 1, enable_safety_checker: true };
  if (isUltraModel(model)) {
    body.aspect_ratio = nearestUltraRatio(width, height); // Ultra sizes by ratio (renders ~2K)
  } else {
    body.image_size = { width, height };
  }
  const res = await fetchWithTimeout(
    `${SYNC}/${model}`,
    {
      method: "POST",
      headers: { Authorization: `Key ${falKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
