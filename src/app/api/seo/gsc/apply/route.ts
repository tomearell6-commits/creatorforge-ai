import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { blogPostUrl, notifyIndexNow } from "@/lib/seo/indexnow";

/**
 * POST /api/seo/gsc/apply { url, title?, description? }
 * Changes the search title and/or description of ONE CreatorsForge blog article (platform owner only).
 * It never touches the article's body or its visible headline. Bing and the other IndexNow engines are told.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const body = await readJsonBody<{ url?: string; title?: string; description?: string }>(request);
  if (!body || typeof body.url !== "string") return apiError("Send the page address.", 400);

  let slug = "";
  try {
    const u = new URL(body.url);
    if (!/^(www\.)?creatorsforge\.io$/i.test(u.hostname)) return apiError("Only CreatorsForge blog articles can be changed here.", 400);
    const m = /^\/blog\/([a-z0-9-]+)\/?$/i.exec(u.pathname);
    if (!m) return apiError("That is not a blog article address.", 400);
    slug = m[1].toLowerCase();
  } catch { return apiError("That page address is not valid.", 400); }

  const patch: Record<string, string> = {};
  if (typeof body.title === "string" && body.title.trim()) patch.meta_title = body.title.trim().slice(0, 70);
  if (typeof body.description === "string" && body.description.trim()) patch.meta_description = body.description.trim().slice(0, 170);
  if (Object.keys(patch).length === 0) return apiError("Nothing to change.", 400);

  const { data, error } = await gate.admin.from("blog_posts").update({ ...patch, updated_at: new Date().toISOString() }).eq("slug", slug).eq("status", "published").select("slug").maybeSingle();
  if (error) return apiError(error.message, 500);
  if (!data) return apiError("That article was not found or is not published.", 404);

  const indexnow = await notifyIndexNow(gate.admin, blogPostUrl(slug));
  return NextResponse.json({ ok: true, indexnow: indexnow.message });
}
