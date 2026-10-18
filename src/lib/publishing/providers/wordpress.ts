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
import { fetchWithTimeout } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyIndexNow } from "@/lib/seo/indexnow";

// Some managed hosts (LiteSpeed/WAF) block REST requests without a browser-like
// User-Agent. Send one on every WordPress call for compatibility.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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

export type WpAuthCheck =
  | { ok: true }
  | { ok: false; kind: "bad_login" | "blocked" | "unreachable" | "rest_off"; message: string };

/**
 * Check a WordPress login WITHOUT depending on one specific page. Many hosts and security
 * plugins block /wp-json/wp/v2/users (to stop user enumeration) and answer 403 even for a
 * correct login, so we try several admin-only pages and read WordPress's own error code to
 * tell a wrong password apart from a firewall block.
 */
export async function checkWordPressAuth(site: string, auth: string): Promise<WpAuthCheck> {
  const paths = [
    "/wp-json/wp/v2/users/me?context=edit",
    "/wp-json/wp/v2/posts?context=edit&per_page=1",
    "/wp-json/wp/v2/settings",
  ];
  let blocked = false;
  let headerNotAccepted = false;
  for (const p of paths) {
    let res: Response;
    try {
      res = await fetchWithTimeout(`${site}${p}`, { headers: { Authorization: auth, "User-Agent": UA, Accept: "application/json" } }, 20_000);
    } catch {
      return { ok: false, kind: "unreachable", message: "Could not reach the site. Check the address and that the website is online and public." };
    }
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => "");
    let code = "";
    try { code = (JSON.parse(text) as { code?: string }).code ?? ""; } catch { /* not JSON = a firewall page */ }

    if (code === "incorrect_password") return { ok: false, kind: "bad_login", message: "WordPress says the application password is wrong or was revoked. Create a new Application Password and copy it again, exactly." };
    if (code === "invalid_username" || code === "invalid_email") return { ok: false, kind: "bad_login", message: "That username does not exist on this WordPress site. Use the username you log in with (see Users in WordPress)." };
    if (code === "rest_forbidden_context" || code === "rest_forbidden" || code === "rest_cannot_view") { headerNotAccepted = true; continue; }
    if (!code && (res.status === 401 || res.status === 403 || res.status === 406 || res.status === 429)) { blocked = true; continue; } // firewall / security page
    if (res.status === 404) continue;
  }
  if (headerNotAccepted) {
    return { ok: false, kind: "bad_login", message: "WordPress did not accept the login. Either the user is not an Administrator or Editor, or the host is removing the login header (an .htaccess rule fixes that — ask your host)." };
  }
  if (blocked) {
    return { ok: false, kind: "blocked", message: "The website's firewall or a security plugin is blocking the connection (it returned a security page, not WordPress). Allow the WordPress REST API for logged-in requests, or ask your host to allow it." };
  }
  return { ok: false, kind: "rest_off", message: "WordPress's REST API is not reachable on this site. Check that it is enabled (Settings → Permalinks must not be 'Plain') and not disabled by a plugin." };
}

export async function verifyWordPress(input: { siteUrl: string; username: string; appPassword: string }): Promise<
  { ok: true; siteName: string; userName: string } | { ok: false; error: string }
> {
  const site = normalizeSite(input.siteUrl);
  const check = await checkWordPressAuth(site, basicAuth(input.username, input.appPassword));
  if (!check.ok) return { ok: false, error: check.message };
  let siteName = site;
  try {
    const root = await fetchWithTimeout(`${site}/wp-json`, { headers: { "User-Agent": UA } });
    if (root.ok) siteName = (await root.json())?.name || site;
  } catch { /* non-fatal */ }
  return { ok: true, siteName, userName: input.username };
}

/** Resolve a taxonomy term by name, creating it if it doesn't exist. Returns id or null. */
async function resolveTerm(site: string, auth: string, taxonomy: "categories" | "tags", name: string): Promise<number | null> {
  try {
    const found = await fetchWithTimeout(`${site}/wp-json/wp/v2/${taxonomy}?search=${encodeURIComponent(name)}`, {
      headers: { Authorization: auth, "User-Agent": UA },
    });
    if (found.ok) {
      const list = await found.json();
      const exact = Array.isArray(list) && list.find((t: { name?: string }) => t.name?.toLowerCase() === name.toLowerCase());
      if (exact) return exact.id;
    }
    const created = await fetchWithTimeout(`${site}/wp-json/wp/v2/${taxonomy}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ name }),
    });
    if (created.ok) return (await created.json()).id;
  } catch { /* best-effort */ }
  return null;
}

/** Upload an image URL to the WP media library; returns the attachment id or null. */
async function uploadFeaturedImage(site: string, auth: string, imageUrl: string): Promise<number | null> {
  try {
    const img = await fetchWithTimeout(imageUrl, {}, 30_000);
    if (!img.ok) return null;
    const contentType = img.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const bytes = Buffer.from(await img.arrayBuffer());
    const res = await fetchWithTimeout(`${site}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="featured-${Date.now()}.${ext}"`,
        "User-Agent": UA,
      },
      body: bytes,
    }, 30_000);
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
        const res = await fetchWithTimeout(`${site}/wp-json/wp/v2/posts`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json", "User-Agent": UA },
          body: JSON.stringify(post),
        });
        if (!res.ok) {
          const text = await res.text();
          return { status: "failed", error: `WordPress error ${res.status}: ${text.slice(0, 200)}` };
        }
        const created = await res.json();
        // Announce live posts to Bing/Yandex/Naver/Seznam/Yep via IndexNow (free; no-op if the site hasn't connected it).
        if (status === "publish" && typeof created.link === "string") {
          await notifyIndexNow(createAdminClient(), created.link).catch(() => undefined);
        }
        return { status: "published", externalPostId: String(created.id), externalUrl: created.link };
      } catch (err) {
        return { status: "failed", error: err instanceof Error ? err.message : "WordPress publish failed" };
      }
    },
  };
}
