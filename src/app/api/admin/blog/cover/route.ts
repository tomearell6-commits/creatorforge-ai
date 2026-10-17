import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { apiError } from "@/lib/api/respond";
import { canGenerateArticleImages } from "@/lib/seo/images";
import { generateBlogCoverDetailed } from "@/lib/blog/cover";

// Each OpenAI render can take 20-40s; allow several per request.
export const maxDuration = 300;

// Bulk runs render at most this many covers per click so a request never times out.
const BULK_LIMIT = 5;

/**
 * POST — generate an AI cover image for one post ({ id, prompt? }) or for posts
 * missing a cover ({ all: true }, up to BULK_LIMIT per run). Images are rendered
 * by OpenAI (Claude writes the prompt). Platform-funded (no user credits).
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  if (!canGenerateArticleImages()) {
    return apiError("Image generation isn't configured (OPENAI_API_KEY missing).", 400);
  }

  const b = (await request.json().catch(() => ({}))) as { id?: string; prompt?: string; all?: boolean };

  // Bulk: fill covers for posts that don't have one.
  if (b.all) {
    const { data: posts } = await gate.admin
      .from("blog_posts")
      .select("id,title,focus_keyword")
      .is("cover_image_url", null)
      .limit(BULK_LIMIT);
    let done = 0;
    let lastError: string | null = null;
    for (const p of posts ?? []) {
      const r = await generateBlogCoverDetailed(gate.admin, { id: p.id, title: p.title, focus_keyword: p.focus_keyword, ownerId: gate.user.id }, b.prompt);
      if (r.ok) done += 1;
      else lastError = r.error;
    }
    return NextResponse.json({ ok: true, generated: done, attempted: (posts ?? []).length, error: lastError });
  }

  // Single post
  if (!b.id) return apiError("Post id is required.", 400);
  const { data: post } = await gate.admin.from("blog_posts").select("id,title,focus_keyword").eq("id", b.id).maybeSingle();
  if (!post) return apiError("Post not found.", 404);

  const r = await generateBlogCoverDetailed(gate.admin, { id: post.id, title: post.title, focus_keyword: post.focus_keyword, ownerId: gate.user.id }, b.prompt);
  if (!r.ok) return apiError(`Cover generation failed: ${r.error}`, 502);
  return NextResponse.json({ ok: true, cover_image_url: r.url });
}
