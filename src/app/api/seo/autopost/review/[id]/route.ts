import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { sanitizeBlogHtml } from "@/lib/blog/blog";
import { approveDraft, rejectDraft, unpublishArticle } from "@/lib/seo/autopost/review";

/** Publishing to WordPress with an image can take a while. */
export const maxDuration = 120;

/** Preview one article that is waiting for review (the owner only, via RLS). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const { data } = await supabase.from("seo_articles")
    .select("id, seo_title, meta_title, meta_description, article_content, word_count, status, created_at, metadata")
    .eq("id", id).eq("source", "autopost").maybeSingle();
  if (!data) return apiError("Not found.", 404);
  const meta = (data.metadata ?? {}) as { featuredImageUrl?: string };
  return NextResponse.json({
    article: {
      id: data.id, title: data.seo_title, metaDescription: data.meta_description, words: data.word_count, status: data.status,
      createdAt: data.created_at, coverUrl: meta.featuredImageUrl ?? null, html: sanitizeBlogHtml((data.article_content as string) ?? ""),
    },
  });
}

/** Approve (publish) or reject an article waiting for review. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const body = await readJsonBody<{ action?: string }>(request);
  if (!body || (body.action !== "approve" && body.action !== "reject" && body.action !== "unpublish")) return apiError("Choose approve, reject or unpublish.", 400);

  const admin = createAdminClient();
  const result = body.action === "approve" ? await approveDraft(admin, id, user.id)
    : body.action === "unpublish" ? await unpublishArticle(admin, id, user.id)
    : await rejectDraft(admin, id, user.id);
  if (!result.ok) return apiError(result.error, result.status);
  return NextResponse.json(result);
}
