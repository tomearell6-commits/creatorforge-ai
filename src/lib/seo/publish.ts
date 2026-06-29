/**
 * Publish an SEO article to a connected WordPress site via the REST API.
 * Supports draft / publish-now / future (scheduled) with slug, excerpt,
 * categories, tags, and Yoast/Rank Math SEO meta. Reuses the WordPress provider's
 * site normalization; credentials are decrypted by the caller (never stored raw).
 */
import { normalizeSite } from "@/lib/publishing/providers/wordpress";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function basicAuth(username: string, appPassword: string) {
  return `Basic ${Buffer.from(`${username}:${appPassword.replace(/\s+/g, "")}`).toString("base64")}`;
}

async function resolveTerm(site: string, auth: string, taxonomy: "categories" | "tags", name: string): Promise<number | null> {
  try {
    const found = await fetch(`${site}/wp-json/wp/v2/${taxonomy}?search=${encodeURIComponent(name)}`, { headers: { Authorization: auth, "User-Agent": UA } });
    if (found.ok) {
      const list = await found.json();
      const exact = Array.isArray(list) && list.find((t: { name?: string }) => t.name?.toLowerCase() === name.toLowerCase());
      if (exact) return exact.id;
    }
    const created = await fetch(`${site}/wp-json/wp/v2/${taxonomy}`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json", "User-Agent": UA }, body: JSON.stringify({ name }) });
    if (created.ok) return (await created.json()).id;
  } catch { /* best-effort */ }
  return null;
}

export type WpPublishInput = {
  siteUrl: string;
  username: string;
  appPassword: string;
  title: string;
  contentHtml: string;
  excerpt?: string;
  slug?: string;
  category?: string | null;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  /** draft | publish | future. For future, pass scheduledAt (ISO). */
  status: "draft" | "publish" | "future";
  scheduledAt?: string | null;
  /** Optional featured image bytes to upload + attach. */
  featuredImage?: { data: Uint8Array; contentType: string } | null;
};

export type WpPublishResult = { ok: true; postId: string; url: string; status: string } | { ok: false; error: string };

export async function publishArticleToWordPress(input: WpPublishInput): Promise<WpPublishResult> {
  const site = normalizeSite(input.siteUrl);
  const auth = basicAuth(input.username, input.appPassword);

  const categoryId = input.category ? await resolveTerm(site, auth, "categories", input.category) : null;
  const tagIds: number[] = [];
  for (const t of (input.tags ?? []).slice(0, 12)) {
    const id = await resolveTerm(site, auth, "tags", t);
    if (id) tagIds.push(id);
  }

  // Upload featured image to the media library (best-effort).
  let featuredMediaId: number | null = null;
  if (input.featuredImage) {
    try {
      const ext = input.featuredImage.contentType.includes("png") ? "png" : "jpg";
      const res = await fetch(`${site}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": input.featuredImage.contentType,
          "Content-Disposition": `attachment; filename="featured-${Date.now()}.${ext}"`,
          "User-Agent": UA,
        },
        body: Buffer.from(input.featuredImage.data),
      });
      if (res.ok) featuredMediaId = (await res.json()).id;
    } catch { /* best-effort */ }
  }

  const post: Record<string, unknown> = {
    title: input.title,
    content: input.contentHtml,
    status: input.status,
    slug: input.slug,
    excerpt: input.metaDescription || input.excerpt || "",
    meta: {
      _yoast_wpseo_title: input.metaTitle || input.title,
      _yoast_wpseo_metadesc: input.metaDescription || "",
      _yoast_wpseo_focuskw: input.focusKeyword || "",
      rank_math_title: input.metaTitle || input.title,
      rank_math_description: input.metaDescription || "",
      rank_math_focus_keyword: input.focusKeyword || "",
    },
  };
  if (input.status === "future" && input.scheduledAt) post.date = input.scheduledAt;
  if (categoryId) post.categories = [categoryId];
  if (tagIds.length) post.tags = tagIds;
  if (featuredMediaId) post.featured_media = featuredMediaId;

  try {
    const res = await fetch(`${site}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify(post),
    });
    if (!res.ok) return { ok: false, error: `WordPress error ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const created = await res.json();
    return { ok: true, postId: String(created.id), url: created.link, status: created.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "WordPress publish failed" };
  }
}
