import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError } from "@/lib/api/respond";
import { slugifyBlog, estimateReadingMinutes, sanitizeBlogHtml, type BlogStatus } from "@/lib/blog/blog";

type AdminClient = ReturnType<typeof createAdminClient>;

/** GET — all posts (any status) for the admin table. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { data, error } = await gate.admin
    .from("blog_posts")
    .select("id,slug,title,status,category,source,scheduled_for,published_at,reading_minutes,updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) return apiError("Could not load posts.", 500);
  return NextResponse.json({ posts: data ?? [] });
}

/** Ensure the slug is unique by appending -2, -3, … if needed. */
async function uniqueSlug(admin: AdminClient, base: string, ignoreId?: string): Promise<string> {
  const root = base || "post";
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await admin.from("blog_posts").select("id").eq("slug", slug);
    const clash = (data ?? []).some((r) => r.id !== ignoreId);
    if (!clash) return slug;
    n += 1;
    slug = `${root}-${n}`.slice(0, 70);
  }
}

/** POST — create a post (manual or from an AI draft the client already has). */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.title !== "string" || !b.title.trim()) return apiError("A title is required.", 400);

  const content = typeof b.content_html === "string" ? sanitizeBlogHtml(b.content_html) : "";
  const slug = await uniqueSlug(gate.admin, slugifyBlog(typeof b.slug === "string" && b.slug ? b.slug : (b.title as string)));
  const status = (["draft", "scheduled", "published"].includes(b.status as string) ? b.status : "draft") as BlogStatus;

  const row = {
    slug,
    title: (b.title as string).trim(),
    meta_title: (b.meta_title as string) ?? null,
    meta_description: (b.meta_description as string) ?? null,
    excerpt: (b.excerpt as string) ?? null,
    content_html: content,
    cover_image_url: (b.cover_image_url as string) ?? null,
    cover_image_alt: (b.cover_image_alt as string) ?? null,
    tags: Array.isArray(b.tags) ? (b.tags as string[]).slice(0, 12) : [],
    category: (b.category as string) ?? null,
    focus_keyword: (b.focus_keyword as string) ?? null,
    faq_json: Array.isArray(b.faq_json) ? b.faq_json : [],
    status,
    scheduled_for: (b.scheduled_for as string) ?? null,
    published_at: status === "published" ? new Date().toISOString() : null,
    source: (["manual", "ai", "autopilot"].includes(b.source as string) ? b.source : "manual") as string,
    reading_minutes: estimateReadingMinutes(content),
    seo_score: typeof b.seo_score === "number" ? b.seo_score : null,
    created_by: gate.user.id,
  };
  const { data, error } = await gate.admin.from("blog_posts").insert(row).select("id,slug").single();
  if (error) return apiError(error.message || "Could not create the post.", 500);
  return NextResponse.json({ ok: true, post: data });
}

/** PATCH — update fields, publish, schedule, or unpublish. */
export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.id !== "string") return apiError("Post id is required.", 400);

  const patch: Record<string, unknown> = {};
  if (typeof b.title === "string") patch.title = b.title.trim();
  if (typeof b.meta_title === "string") patch.meta_title = b.meta_title;
  if (typeof b.meta_description === "string") patch.meta_description = b.meta_description;
  if (typeof b.excerpt === "string") patch.excerpt = b.excerpt;
  if (typeof b.content_html === "string") { patch.content_html = sanitizeBlogHtml(b.content_html); patch.reading_minutes = estimateReadingMinutes(b.content_html); }
  if (typeof b.cover_image_url === "string") patch.cover_image_url = b.cover_image_url;
  if (typeof b.cover_image_alt === "string") patch.cover_image_alt = b.cover_image_alt;
  if (Array.isArray(b.tags)) patch.tags = (b.tags as string[]).slice(0, 12);
  if (typeof b.category === "string") patch.category = b.category;
  if (Array.isArray(b.faq_json)) patch.faq_json = b.faq_json;
  if (typeof b.slug === "string" && b.slug.trim()) patch.slug = await uniqueSlug(gate.admin, slugifyBlog(b.slug), b.id);

  // Status transitions
  if (b.status === "published") {
    patch.status = "published";
    patch.published_at = new Date().toISOString();
    patch.scheduled_for = null;
  } else if (b.status === "scheduled") {
    if (typeof b.scheduled_for !== "string") return apiError("A scheduled date/time is required.", 400);
    patch.status = "scheduled";
    patch.scheduled_for = b.scheduled_for;
  } else if (b.status === "draft") {
    patch.status = "draft";
    patch.scheduled_for = null;
  }

  const { error } = await gate.admin.from("blog_posts").update(patch).eq("id", b.id);
  if (error) return apiError(error.message || "Could not update the post.", 500);
  return NextResponse.json({ ok: true });
}

/** DELETE — remove a post. */
export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const b = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!b?.id) return apiError("Post id is required.", 400);
  const { error } = await gate.admin.from("blog_posts").delete().eq("id", b.id);
  if (error) return apiError("Could not delete the post.", 500);
  return NextResponse.json({ ok: true });
}
