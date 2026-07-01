import type { ImageProvider, ImageGenInput } from "../types";
import { fetchWithTimeout } from "@/lib/http";

/**
 * Placeholder image provider — deterministic stock image (picsum) fetched to
 * raw bytes so the route can store our own copy. No API key required.
 */
const placeholderImageProvider: ImageProvider = {
  id: "placeholder",
  name: "CreatorsForge Placeholder Images",
  async generate(input: ImageGenInput) {
    const width = input.width ?? 1280;
    const height = input.height ?? 720;
    const seed = encodeURIComponent(input.seed || input.prompt.slice(0, 40) || "creatorforge");
    const res = await fetchWithTimeout(`https://picsum.photos/seed/${seed}/${width}/${height}`, {}, 30_000);
    if (!res.ok) throw new Error(`Placeholder image fetch failed (${res.status})`);
    return {
      data: new Uint8Array(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") || "image/jpeg",
      width,
      height,
      provider: "placeholder",
    };
  },
};

/**
 * OpenAI image provider (gpt-image-1). Returns base64 JPEG bytes.
 * Activated by IMAGE_PROVIDER=openai + OPENAI_API_KEY. gpt-image-1 supports a
 * fixed set of sizes, so we map to the nearest by aspect ratio.
 */
const openAIImageProvider: ImageProvider = {
  id: "openai",
  name: "OpenAI gpt-image-1",
  async generate(input: ImageGenInput) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

    const wantLandscape = (input.width ?? 1280) >= (input.height ?? 720);
    const size = wantLandscape ? "1536x1024" : "1024x1024";

    const res = await fetchWithTimeout("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: input.prompt,
        n: 1,
        size,
        quality: "high",
        output_format: "jpeg",
      }),
    }, 30_000);
    if (!res.ok) {
      throw new Error(`OpenAI image error ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI image response had no image data");

    const [w, h] = size.split("x").map(Number);
    return {
      data: new Uint8Array(Buffer.from(b64, "base64")),
      contentType: "image/jpeg",
      width: w,
      height: h,
      provider: "openai",
    };
  },
};

/**
 * Google image provider via the Gemini API. Default model: Imagen 4
 * (imagen-4.0-generate-001) using the :predict endpoint, which supports real
 * aspect ratios (16:9 / 9:16 / 1:1) — ideal for video scenes. Override the model
 * with GEMINI_IMAGE_MODEL (e.g. gemini-2.5-flash-image). Activated by
 * IMAGE_PROVIDER=gemini + GEMINI_API_KEY.
 */
const geminiImageProvider: ImageProvider = {
  id: "gemini",
  name: "Google Gemini / Imagen image generation",
  async generate(input: ImageGenInput) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    // Default to the free-tier-friendly Gemini 2.5 Flash Image ("Nano Banana").
    // Override with GEMINI_IMAGE_MODEL=imagen-4.0-generate-001 (needs billing) for
    // dedicated 16:9 Imagen output.
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
    const base = "https://generativelanguage.googleapis.com/v1beta/models";

    const w = input.width ?? 1280;
    const h = input.height ?? 720;
    const aspectRatio = w > h ? "16:9" : w < h ? "9:16" : "1:1";

    // Imagen models use the :predict endpoint (aspectRatio param).
    if (model.startsWith("imagen")) {
      const res = await fetchWithTimeout(`${base}/${model}:predict?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instances: [{ prompt: input.prompt }], parameters: { sampleCount: 1, aspectRatio } }),
      }, 30_000);
      if (!res.ok) throw new Error(`Gemini (Imagen) error ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { predictions?: { bytesBase64Encoded?: string; mimeType?: string }[] };
      const pred = json.predictions?.[0];
      if (!pred?.bytesBase64Encoded) throw new Error("Imagen response had no image data");
      return { data: new Uint8Array(Buffer.from(pred.bytesBase64Encoded, "base64")), contentType: pred.mimeType || "image/png", width: w, height: h, provider: "gemini" };
    }

    // Gemini image models use :generateContent (image returned as inlineData).
    const res = await fetchWithTimeout(`${base}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${input.prompt}\n\nGenerate a ${aspectRatio} widescreen, high-quality, photorealistic image.` }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    }, 30_000);
    if (!res.ok) throw new Error(`Gemini image error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
    };
    const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) throw new Error("Gemini image response had no image data");
    return { data: new Uint8Array(Buffer.from(part.inlineData.data, "base64")), contentType: part.inlineData.mimeType || "image/png", width: w, height: h, provider: "gemini" };
  },
};

/** Resolve the active image provider from IMAGE_PROVIDER (default: placeholder). */
export function getImageProvider(): ImageProvider {
  switch (process.env.IMAGE_PROVIDER) {
    case "openai":
      return openAIImageProvider;
    case "gemini":
      return geminiImageProvider;
    default:
      return placeholderImageProvider;
  }
}
