/**
 * WordPress publishing provider (real). Connects via the WordPress REST API +
 * Application Passwords (Basic auth) — no plugin or OAuth app required, works on
 * self-hosted WordPress 5.6+. Publishes the AI-generated SEO article as a post.
 *
 * Connect:  POST {site}/wp-json/wp/v2/users/me   (verify credentials)
 * Publish:  POST {site}/wp-json/wp/v2/posts       (create the post)
 */
import type { PublishProvider, PublishInput, PublishResult } from "../types";

/** Normalize a site URL: ensure scheme, strip trailing slash + any /wp-json. */
export function normalizeSite(url: string): string {
  let u = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u.replace(/\/wp-json.*$/i, "");
}

function basicAuth(username: string, appPassword: string): string {
  // Application passwords are shown with spaces; WordPress accepts them with or without.
  const token = Buffer.from(`${username}:${appPassword.replace(/\s+/g, "")}`).toString("base64");
  return `Basic ${token}`;
}

/** Verify credentials by fetching the authenticated user + site name. */
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

/** Minimal text→HTML so a plain script posts as readable paragraphs. */
function toHtml(body: string): string {
  if (/<[a-z][\s\S]*>/i.test(body)) return body; // already HTML
  return body
    .split(/\n{2,}/)
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

export function wordpressProvider(): PublishProvider {
  return {
    id: "wordpress",
    configured: true, // real provider; auth comes from the connected account
    async publish(input: PublishInput): Promise<PublishResult> {
      const site = input.account.siteUrl ? normalizeSite(input.account.siteUrl) : null;
      const username = input.account.username;
      const appPassword = input.account.accessToken;
      if (!site || !username || !appPassword) {
        return { status: "failed", error: "WordPress account is missing site URL or credentials." };
      }

      const status =
        input.visibility === "public" ? "publish" : input.visibility === "private" ? "private" : "draft";
      const body = toHtml(input.articleHtml || input.description || "");

      try {
        const res = await fetch(`${site}/wp-json/wp/v2/posts`, {
          method: "POST",
          headers: { Authorization: basicAuth(username, appPassword), "Content-Type": "application/json" },
          body: JSON.stringify({
            title: input.title,
            content: body,
            status,
            excerpt: input.description?.slice(0, 300) ?? "",
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          return { status: "failed", error: `WordPress error ${res.status}: ${text.slice(0, 200)}` };
        }
        const post = await res.json();
        return { status: "published", externalPostId: String(post.id), externalUrl: post.link };
      } catch (err) {
        return { status: "failed", error: err instanceof Error ? err.message : "WordPress publish failed" };
      }
    },
  };
}
