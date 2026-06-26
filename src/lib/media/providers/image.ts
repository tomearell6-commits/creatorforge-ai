import type { ImageProvider, ImageGenInput } from "../types";

/**
 * Placeholder image provider — deterministic stock image (picsum) fetched to
 * raw bytes so the route can store our own copy. No API key required.
 */
const placeholderImageProvider: ImageProvider = {
  id: "placeholder",
  name: "CreatorForge Placeholder Images",
  async generate(input: ImageGenInput) {
    const width = input.width ?? 1280;
    const height = input.height ?? 720;
    const seed = encodeURIComponent(input.seed || input.prompt.slice(0, 40) || "creatorforge");
    const res = await fetch(`https://picsum.photos/seed/${seed}/${width}/${height}`);
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

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: input.prompt,
        n: 1,
        size,
        quality: "medium",
        output_format: "jpeg",
      }),
    });
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

/** Resolve the active image provider from IMAGE_PROVIDER (default: placeholder). */
export function getImageProvider(): ImageProvider {
  switch (process.env.IMAGE_PROVIDER) {
    case "openai":
      return openAIImageProvider;
    default:
      return placeholderImageProvider;
  }
}
