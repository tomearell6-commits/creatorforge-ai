import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { applyRevision, discardRevision, undoRevision, type RevisionRow } from "@/lib/blog/refresh";

/**
 * GET  /api/seo/refresh/:id                -> the new version (and how it compares) for review
 * POST /api/seo/refresh/:id { action }     -> "apply" (publish it), "undo" (restore the old one), "discard"
 * Platform owner only. Applying and undoing tell Bing and the other IndexNow engines.
 */
export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { id } = await ctx.params;
  const { data } = await gate.admin.from("blog_post_revisions").select("*").eq("id", id).maybeSingle();
  if (!data) return apiError("Not found.", 404);
  const r = data as RevisionRow;
  const { data: post } = await gate.admin.from("blog_posts").select("title, slug").eq("id", r.post_id).maybeSingle();
  const headings = (html: string) => [...html.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: Number(m[1]), text: m[2].replace(/<[^>]+>/g, "").trim() })).filter((h) => h.text).slice(0, 40);
  return NextResponse.json({
    id: r.id, status: r.status, title: post?.title ?? "", slug: post?.slug ?? "",
    oldWords: r.old_words, newWords: r.new_words, newHtml: r.new_html, newFaq: r.new_faq,
    oldHeadings: headings(r.old_html), newHeadings: headings(r.new_html),
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { id } = await ctx.params;
  const body = await readJsonBody<{ action?: string }>(request);
  if (!body || !["apply", "undo", "discard"].includes(body.action ?? "")) return apiError("Choose apply, undo or discard.", 400);

  if (body.action === "discard") {
    const d = await discardRevision(gate.admin, id);
    return d.ok ? NextResponse.json({ ok: true, message: "Discarded. The published post was not touched." }) : apiError(d.error, d.status);
  }
  const r = body.action === "apply" ? await applyRevision(gate.admin, id) : await undoRevision(gate.admin, id);
  return r.ok ? NextResponse.json({ ok: true, message: r.message }) : apiError(r.error, r.status);
}
