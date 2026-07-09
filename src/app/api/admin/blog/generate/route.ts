import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError } from "@/lib/api/respond";
import { generateSeoPackage, type SeoArticleInput } from "@/lib/seo/generate";
import { slugifyBlog, estimateReadingMinutes, sanitizeBlogHtml } from "@/lib/blog/blog";
import { generateBlogCover } from "@/lib/blog/cover";

type AdminClient = ReturnType<typeof createAdminClient>;

export const maxDuration = 60;

/**
 * POST — generate a full blog draft from a keyword using the platform's own
 * SEO Content Studio generator, and save it as a draft in blog_posts.
 * Body: { keyword, category?, tone?, audience?, secondaryKeywords?, publish? }
 * The owner's marketing blog does NOT consume user credits (it's first-party
 * content, generated with the platform's own AI budget).
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const keyword = typeof b?.keyword === "string" ? b.keyword.trim() : "";
  if (!keyword) return apiError("A focus keyword or topic is required.", 400);

  const input: SeoArticleInput = {
    mainKeyword: keyword,
    secondaryKeywords: Array.isArray(b?.secondaryKeywords) ? (b!.secondaryKeywords as string[]) : undefined,
    targetAudience: typeof b?.audience === "string" ? b.audience : "creators, marketers, and small businesses",
    searchIntent: typeof b?.searchIntent === "string" ? b.searchIntent : undefined,
    articleType: typeof b?.category === "string" ? b.category : "Blog",
    tone: typeof b?.tone === "string" ? b.tone : "professional, helpful",
    brandName: "CreatorsForge",
    productName: "CreatorsForge",
    cta: "Start free at CreatorsForge.io",
  };

  let pkg, usedAI;
  try {
    ({ pkg, usedAI } = await generateSeoPackage(input));
  } catch (e) {
    return apiError(`Generation failed: ${(e as Error).message}`, 502);
  }

  const content = sanitizeBlogHtml(pkg.articleContent);
  const publish = b?.publish === true;
  const slug = await ensureUniqueSlug(gate.admin, slugifyBlog(pkg.slug || keyword));

  const row = {
    slug,
    title: pkg.seoTitle || pkg.h1 || keyword,
    meta_title: pkg.metaTitle || null,
    meta_description: pkg.metaDescription || null,
    excerpt: pkg.excerpt || null,
    content_html: content,
    tags: (pkg.tags ?? []).slice(0, 12),
    category: pkg.category || (typeof b?.category === "string" ? b.category : "Blog"),
    focus_keyword: pkg.focusKeyword || keyword,
    faq_json: pkg.faq ?? [],
    status: publish ? "published" : "draft",
    published_at: publish ? new Date().toISOString() : null,
    source: "ai",
    reading_minutes: estimateReadingMinutes(content),
    seo_score: typeof pkg.seoScore === "number" ? pkg.seoScore : null,
    created_by: gate.user.id,
  };

  const { data, error } = await gate.admin.from("blog_posts").insert(row).select("id,slug,title,status").single();
  if (error) return apiError(error.message || "Could not save the draft.", 500);

  // Best-effort: auto-generate a cover image (platform-funded). Never fails the
  // article if the image render/upload has a problem — the post keeps the
  // branded placeholder and a cover can be added later from the admin panel.
  let cover: string | null = null;
  try {
    const r = await generateBlogCover(
      gate.admin,
      { id: data.id, title: row.title, focus_keyword: row.focus_keyword, ownerId: gate.user.id },
      pkg.featuredImagePrompt
    );
    cover = r?.url ?? null;
  } catch { /* keep placeholder */ }

  return NextResponse.json({ ok: true, usedAI, post: data, cover_image_url: cover });
}

async function ensureUniqueSlug(admin: AdminClient, base: string): Promise<string> {
  const root = base || "post";
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await admin.from("blog_posts").select("id").eq("slug", slug);
    if (!(data ?? []).length) return slug;
    n += 1;
    slug = `${root}-${n}`.slice(0, 70);
  }
}
