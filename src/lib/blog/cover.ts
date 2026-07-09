/**
 * Blog cover-image generation (SERVER-ONLY).
 *
 * Renders an editorial hero image for a post via fal.ai FLUX (the same provider
 * as Design Studio), rehosts it from fal's temporary URL to Supabase Storage,
 * and writes cover_image_url / cover_image_alt onto the post. Best-effort: the
 * caller decides what to do if it returns null (e.g. keep the gradient
 * placeholder). Uses the platform's own image budget — no user credits.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateDesignImage, willUseRealDesignImages } from "@/lib/design/image";
import { uploadFromUrl } from "@/lib/media/storage";

export function coverPromptFor(title: string, keyword?: string | null): string {
  const topic = (keyword || title).trim();
  return (
    `Editorial hero illustration for a blog article about ${topic}. ` +
    `Modern, clean, professional, vibrant tech/marketing aesthetic, soft gradients, ` +
    `abstract shapes and iconography. High quality, 16:9. No text, no words, no letters, no logos.`
  );
}

export type CoverResult = { url: string; alt: string } | null;

/**
 * Generate + attach a cover image to a post. Returns the new URL, or null if
 * images aren't configured or the render/upload failed (caller stays graceful).
 */
export async function generateBlogCover(
  admin: SupabaseClient,
  post: { id: string; title: string; focus_keyword?: string | null; ownerId: string },
  customPrompt?: string
): Promise<CoverResult> {
  if (!willUseRealDesignImages()) return null; // no FAL_KEY → skip silently

  try {
    const prompt = (customPrompt && customPrompt.trim()) || coverPromptFor(post.title, post.focus_keyword);
    const img = await generateDesignImage(prompt, { width: 1200, height: 630 });
    const uploaded = await uploadFromUrl(admin, {
      userId: post.ownerId,
      type: "image",
      sourceUrl: img.url,
      ext: "jpg",
      contentType: "image/jpeg",
    });
    const alt = post.title;
    const { error } = await admin
      .from("blog_posts")
      .update({ cover_image_url: uploaded.url, cover_image_alt: alt })
      .eq("id", post.id);
    if (error) return null;
    return { url: uploaded.url, alt };
  } catch {
    return null;
  }
}
