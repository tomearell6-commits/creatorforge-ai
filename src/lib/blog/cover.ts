/**
 * Blog cover-image generation (SERVER-ONLY).
 *
 * Renders a realistic editorial hero image for a post with OpenAI gpt-image-1
 * (see lib/seo/images.ts — Claude writes the prompt, OpenAI draws it), stores it in
 * Supabase Storage, and writes cover_image_url / cover_image_alt onto the post.
 * Uses the platform's own image budget — no user credits.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateArticleImage, canGenerateArticleImages } from "@/lib/seo/images";
import { uploadMedia } from "@/lib/media/storage";

export type CoverResult = { url: string; alt: string } | null;
export type CoverOutcome = { ok: true; url: string; alt: string } | { ok: false; error: string };

type CoverPost = { id: string; title: string; focus_keyword?: string | null; ownerId: string };

/** Generate + attach a cover. Never throws; returns the real failure reason. */
export async function generateBlogCoverDetailed(
  admin: SupabaseClient,
  post: CoverPost,
  customPrompt?: string
): Promise<CoverOutcome> {
  if (!canGenerateArticleImages()) return { ok: false, error: "OPENAI_API_KEY is not set." };
  try {
    const img = await generateArticleImage({
      title: post.title,
      keyword: post.focus_keyword,
      basePrompt: customPrompt?.trim() || null,
    });
    const uploaded = await uploadMedia(admin, {
      userId: post.ownerId,
      type: "image",
      bytes: img.data,
      contentType: img.contentType,
      ext: "jpg",
    });
    const alt = post.title;
    const { error } = await admin
      .from("blog_posts")
      .update({ cover_image_url: uploaded.url, cover_image_alt: alt })
      .eq("id", post.id);
    if (error) return { ok: false, error: `Saved the image but could not attach it to the post: ${error.message}` };
    return { ok: true, url: uploaded.url, alt };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Cover generation failed." };
  }
}

/** Back-compat wrapper: the cover, or null if it could not be made. */
export async function generateBlogCover(
  admin: SupabaseClient,
  post: CoverPost,
  customPrompt?: string
): Promise<CoverResult> {
  const r = await generateBlogCoverDetailed(admin, post, customPrompt);
  return r.ok ? { url: r.url, alt: r.alt } : null;
}
