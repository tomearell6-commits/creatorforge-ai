/**
 * Generate a featured image for an SEO article from its featured_image_prompt,
 * using the active image provider (Gemini/OpenAI/placeholder). Returns raw bytes
 * for WordPress media upload, or null on failure (publish still proceeds).
 */
import { getImageProvider } from "@/lib/media/providers/image";

export async function generateFeaturedImage(
  prompt: string | null | undefined
): Promise<{ data: Uint8Array; contentType: string; provider: string } | null> {
  if (!prompt?.trim()) return null;
  try {
    const provider = getImageProvider();
    const res = await provider.generate({ prompt, width: 1280, height: 720, seed: prompt.slice(0, 40) });
    return { data: res.data, contentType: res.contentType, provider: provider.id };
  } catch {
    return null;
  }
}
