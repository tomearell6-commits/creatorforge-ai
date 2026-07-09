import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { apiError } from "@/lib/api/respond";
import { willUseRealDesignImages } from "@/lib/design/image";
import { generateBlogCover } from "@/lib/blog/cover";

export const maxDuration = 60;

/**
 * POST — generate an AI cover image for one post ({ id, prompt? }) or for every
 * post missing a cover ({ all: true }). Platform-funded (no user credits).
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  if (!willUseRealDesignImages()) {
    return apiError("Image generation isn't configured (FAL_KEY missing). Covers will use the branded placeholder.", 400);
  }

  const b = (await request.json().catch(() => ({}))) as { id?: string; prompt?: string; all?: boolean };

  // Bulk: fill covers for all posts that don't have one (cap to keep within the time budget).
  if (b.all) {
    const { data: posts } = await gate.admin
      .from("blog_posts")
      .select("id,title,focus_keyword")
      .is("cover_image_url", null)
      .limit(12);
    let done = 0;
    for (const p of posts ?? []) {
      const r = await generateBlogCover(gate.admin, { id: p.id, title: p.title, focus_keyword: p.focus_keyword, ownerId: gate.user.id }, b.prompt);
      if (r) done += 1;
    }
    return NextResponse.json({ ok: true, generated: done, attempted: (posts ?? []).length });
  }

  // Single post
  if (!b.id) return apiError("Post id is required.", 400);
  const { data: post } = await gate.admin.from("blog_posts").select("id,title,focus_keyword").eq("id", b.id).maybeSingle();
  if (!post) return apiError("Post not found.", 404);

  const r = await generateBlogCover(gate.admin, { id: post.id, title: post.title, focus_keyword: post.focus_keyword, ownerId: gate.user.id }, b.prompt);
  if (!r) return apiError("Cover generation failed. Please try again.", 502);
  return NextResponse.json({ ok: true, cover_image_url: r.url });
}
