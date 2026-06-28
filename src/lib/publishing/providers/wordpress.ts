/**
 * WordPress publishing provider (real, SEO-complete). Connects via the WordPress
 * REST API + Application Passwords (Basic auth) — no plugin or OAuth required,
 * works on self-hosted WordPress 5.6+.
 *
 * Publishes the AI-generated article as a post with:
 *  - title, HTML content, excerpt, status, slug
 *  - categories + tags (resolved to term IDs, created if missing)
 *  - featured image (uploaded to the media library from the thumbnail URL)
 *  - SEO meta (Yoast + Rank Math keys, best-effort via REST meta)
 */
import type { PublishProvider, PublishInput, PublishResult } from "../types";
import { CATEGORIES } from "@/lib/constants";

export function normalizeSite(url: string): string {
  let u = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u.replace(/\/wp-json.*$/i, "");
}

function basicAuth(username: string, appPassword: string): string {
  const token = Buffer.from(`${username}:${appPassword.replace(/\s+/g, "")}`).toString("base64");
  return `Basic ${token}`;
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function toHtml(body: string): string {
  if (/<[a-z][\s\S]*>/i.test(body)) return body;
  return body.split(/\n{2,}/).map((p) => `<p>${p.trim().replace(/\n/g, "<br/>")}</p>`).join("\n");
}

export async function verifyWordPress(input: { siteUrl: string; username: string; appPassword: string }): Promise<
  { ok: true; siteName: string; userName: string } | { ok: false; error: string }
> {
  const site = normalizeSite(input.siteUrl);
  try {
    const me = await fetch(`${site}/wp-json/wp/v2/users/me?context=edit`, {
      headers: { Authorization: basicAuth(input.username, input.appPassword) },
    });
    if (me.status === 401 || me.status === 403) return { ok: false, error: "Invalid username or application password." };
    if (!me.ok) return { ok: false, error: `WordPress REST API not reachable (HTTP ${me.status}). Is the REST API enabled?` };
    const user = await me.json();
    let siteName = site;
    try {
      const root = await fetch(`${site}/wp-json`);
      if (root.ok) siteName = (await root.json())?.name || site;
    } catch { /* non-fatal */ }
    return { ok: true, siteName, userName: user?.name || input.username };
  } catch {
    return { ok: false, error: "Could not reach the site. Check the URL and that it's publicly accessible." };
  }
}

/** Resolve a taxonomy term by name, creating it if it doesn't exist. Returns id or null. */
async function resolveTerm(site: string, auth: string, taxonomy: "categories" | "tags", name: string): Promise<number | null> {
  try {
    const found = await fetch(`${site}/wp-json/wp/v2/${taxonomy}?search=${encodeURIComponent(name)}`, {
      headers: { Authorization: auth },
    });
    if (found.ok) {
      const list = await found.json();
      const exact = Array.isArray(list) && list.find((t: { name?: string }) => t.name?.toLowerCase() === name.toLowerCase());
      if (exact) return exact.id;
    }
    const created = await fetch(`${site}/wp-json/wp/v2/${taxonomy}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (created.ok) return (await created.json()).id;
  } catch { /* best-effort */ }
  return null;
}

/** Upload an image URL to the WP media library; returns the attachment id or null. */
async function uploadFeaturedImage(site: string, auth: string, imageUrl: string): Promise<number | null> {
  try {
    const img = await fetch(imageUrl);
    if (!img.ok) return null;
    const contentType = img.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const bytes = Buffer.from(await img.arrayBuffer());
    const res = await fetch(`${site}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="featured-${Date.now()}.${ext}"`,
      },
      body: bytes,
    });
    if (res.ok) return (await res.json()).id;
  } catch { /* best-effort */ }
  return null;
}

export function wordpressProvider(): PublishProvider {
  return {
    id: "wordpress",
    configured: true,
    async publish(input: PublishInput): Promise<PublishResult> {
      const site = input.account.siteUrl ? normalizeSite(input.account.siteUrl) : null;
      const username = input.account.username;
      const appPassword = input.account.accessToken;
      if (!site || !username || !appPassword) {
        return { status: "failed", error: "WordPress account is missing site URL or credentials." };
      }
      const auth = basicAuth(username, appPassword);
      const status = input.visibility === "public" ? "publish" : input.visibility === "private" ? "private" : "draft";
      const body = toHtml(input.articleHtml || input.description || "");

      // SEO fields derived from the (AI-optimized) job data.
      const tagNames = [...(input.hashtags ?? []), ...(input.tags ?? [])]
        .map((t) => t.replace(/^#/, "").trim())
        .filter(Boolean);
      const categoryName = CATEGORIES.find((c) => c.slug === input.category)?.name || input.category || null;
      const focusKeyword = tagNames[0] || categoryName || "";
      const metaDescription = (input.description || "").slice(0, 160);

      // Best-effort enrichment (never blocks the post).
      const featuredMedia = input.thumbnailUrl ? await uploadFeaturedImage(site, auth, input.thumbnailUrl) : null;
      const categoryId = categoryName ? await resolveTerm(site, auth, "categories", categoryName) : null;
      const tagIds: number[] = [];
      for (const name of tagNames.slice(0, 10)) {
        const id = await resolveTerm(site, auth, "tags", name);
        if (id) tagIds.push(id);
      }

      const post: Record<string, unknown> = {
        title: input.title,
        content: body,
        status,
        slug: slugify(input.title),
        excerpt: metaDescription,
        // SEO meta: send both Yoast and Rank Math keys; WP persists whichever the
        // active plugin has registered for REST (silently ignores the rest).
        meta: {
          _yoast_wpseo_title: input.title,
          _yoast_wpseo_metadesc: metaDescription,
          _yoast_wpseo_focuskw: focusKeyword,
          rank_math_title: input.title,
          rank_math_description: metaDescription,
          rank_math_focus_keyword: focusKeyword,
        },
      };
      if (featuredMedia) post.featured_media = featuredMedia;
      if (categoryId) post.categories = [categoryId];
      if (tagIds.length) post.tags = tagIds;

      try {
        const res = await fetch(`${site}/wp-json/wp/v2/posts`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify(post),
        });
        if (!res.ok) {
          const text = await res.text();
          return { status: "failed", error: `WordPress error ${res.status}: ${text.slice(0, 200)}` };
        }
        const created = await res.json();
        return { status: "published", externalPostId: String(created.id), externalUrl: created.link };
      } catch (err) {
        return { status: "failed", error: err instanceof Error ? err.message : "WordPress publish failed" };
      }
    },
  };
}
