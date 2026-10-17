/**
 * Generate a featured image for an SEO article, using OpenAI (see ./images.ts).
 * Returns raw bytes for WordPress media upload, or null on failure / when OpenAI
 * isn't configured (the post still publishes, just without an image — we never
 * attach a random placeholder photo).
 */
import { generateArticleImage } from "./images";

export async function generateFeaturedImage(
  prompt: string | null | undefined,
  context?: { title?: string | null; keyword?: string | null }
): Promise<{ data: Uint8Array; contentType: string; provider: string } | null> {
  const title = (context?.title || prompt || "").trim();
  if (!title) return null;
  try {
    const img = await generateArticleImage({ title, keyword: context?.keyword, basePrompt: prompt });
    return { data: img.data, contentType: img.contentType, provider: img.provider };
  } catch {
    return null;
  }
}
