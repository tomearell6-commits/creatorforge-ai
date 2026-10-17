/**
 * Article images for the SEO department (blog covers + WordPress featured images).
 *
 * OpenAI gpt-image-1 ONLY — by design. We never fall back to a random placeholder
 * photo or another vendor, because a wrong-looking image on a health article is
 * worse than none. Claude writes the prompt; OpenAI renders it. Quality defaults to
 * "medium" (set SEO_IMAGE_QUALITY=low|medium|high) to keep per-post cost down.
 */
import { getOpenAIImageProvider, hasOpenAIImages } from "@/lib/media/providers/image";
import { articleImagePrompt, isHealthTopic } from "./health";

export type ArticleImage = { data: Uint8Array; contentType: string; provider: "openai" };

function quality(): "low" | "medium" | "high" {
  const q = process.env.SEO_IMAGE_QUALITY;
  return q === "low" || q === "high" ? q : "medium";
}

export function canGenerateArticleImages(): boolean {
  return hasOpenAIImages();
}

/** Render one realistic editorial image. Throws with a readable message on failure. */
export async function generateArticleImage(opts: {
  title: string;
  keyword?: string | null;
  basePrompt?: string | null;
}): Promise<ArticleImage> {
  if (!hasOpenAIImages()) throw new Error("OPENAI_API_KEY is not set — article images are generated with OpenAI.");
  const health = isHealthTopic(opts.title, opts.keyword);
  const prompt = articleImagePrompt({ subject: opts.keyword || opts.title, health, basePrompt: opts.basePrompt });
  const res = await getOpenAIImageProvider().generate({ prompt, width: 1536, height: 1024, quality: quality() });
  return { data: res.data, contentType: res.contentType, provider: "openai" };
}
