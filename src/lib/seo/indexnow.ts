/**
 * IndexNow — tell search engines the moment a post goes live.
 *
 * One submission to api.indexnow.org is shared with every participating engine:
 * Bing, Yandex, Naver, Seznam and Yep. (DuckDuckGo and Yahoo build on Bing's index,
 * so they benefit indirectly. Google does NOT support IndexNow — it finds posts via
 * the sitemap and Search Console.) IndexNow is FREE and only speeds up discovery; it
 * cannot force an engine to index a page.
 *
 * How ownership is proven: the site must serve a text file at https://<host>/<key>.txt
 * containing the key. For CreatorsForge's own blog that file lives in /public. For a
 * client WordPress site the user uploads the file we give them (or pastes the key of an
 * IndexNow plugin they already run); we verify it by fetching the file.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { fetchWithTimeout } from "@/lib/http";
import { validateAuditUrl } from "@/lib/seo-audit/ssrf";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** Public by design (the same value is served at /<key>.txt). */
export const CREATORSFORGE_INDEXNOW_KEY = "45e061fccb4219334363de3ed83ee5ec";
const CREATORSFORGE_HOSTS = new Set(["www.creatorsforge.io", "creatorsforge.io"]);

/** Public URL of a CreatorsForge blog post (for IndexNow after it is published). */
export const blogPostUrl = (slug: string) => `https://www.creatorsforge.io/blog/${slug}`;

export type IndexNowResult = {
  status: "submitted" | "not_configured" | "failed";
  message: string;
  httpStatus?: number;
};

export function generateIndexNowKey(): string {
  return randomBytes(16).toString("hex");
}

/** IndexNow keys are 8–128 characters: letters, digits and dashes. */
export function isValidIndexNowKey(key: string): boolean {
  return /^[a-zA-Z0-9-]{8,128}$/.test(key);
}

const bareHost = (h: string) => h.toLowerCase().replace(/^www\./, "");

/** Submit URLs to IndexNow. `host` must match every URL's host. */
export async function submitToIndexNow(args: { host: string; key: string; urls: string[] }): Promise<IndexNowResult> {
  const urls = args.urls.filter(Boolean);
  if (!urls.length) return { status: "failed", message: "No URL to submit." };
  try {
    const res = await fetchWithTimeout(
      INDEXNOW_ENDPOINT,
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host: args.host, key: args.key, keyLocation: `https://${args.host}/${args.key}.txt`, urlList: urls }),
      },
      15_000
    );
    if (res.status === 200 || res.status === 202) {
      return { status: "submitted", httpStatus: res.status, message: "Submitted to Bing, Yandex, Naver, Seznam and Yep via IndexNow." };
    }
    const reason =
      res.status === 403 ? "the key file could not be found on the site (upload it to the site's root folder)"
      : res.status === 422 ? "the URL does not belong to the site the key was registered for"
      : res.status === 429 ? "too many submissions — will retry with the next post"
      : res.status === 400 ? "the request was rejected as malformed"
      : `unexpected response ${res.status}`;
    return { status: "failed", httpStatus: res.status, message: `IndexNow rejected the submission: ${reason}.` };
  } catch (e) {
    return { status: "failed", message: `IndexNow could not be reached: ${e instanceof Error ? e.message : "network error"}.` };
  }
}

/** Confirm the site serves its key file (proof of ownership). */
export async function verifyIndexNowKeyFile(siteUrl: string, key: string): Promise<{ verified: boolean; reason?: string }> {
  if (!isValidIndexNowKey(key)) return { verified: false, reason: "The key must be 8–128 letters, numbers or dashes." };
  const base = siteUrl.replace(/\/+$/, "");
  const fileUrl = `${base}/${key}.txt`;
  const safe = await validateAuditUrl(fileUrl);
  if (!safe.ok) return { verified: false, reason: safe.error };
  try {
    const res = await fetchWithTimeout(fileUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CreatorsForgeBot/1.0)" } }, 15_000);
    if (!res.ok) return { verified: false, reason: `The file was not found at ${fileUrl} (HTTP ${res.status}).` };
    const body = (await res.text()).trim();
    if (body !== key) return { verified: false, reason: "The file exists but its contents do not match the key." };
    return { verified: true };
  } catch {
    return { verified: false, reason: "Could not reach the website to check the key file." };
  }
}

type SiteIndexNow = { id: string; key: string };

/** Find a verified IndexNow key for the website that owns this host (client WordPress sites). */
async function keyForHost(admin: SupabaseClient, host: string): Promise<SiteIndexNow | null> {
  const bare = bareHost(host);
  const { data } = await admin.from("wordpress_sites").select("id, site_url, metadata").ilike("site_url", `%${bare}%`).limit(10);
  for (const row of data ?? []) {
    let h = "";
    try { h = bareHost(new URL((row.site_url as string).startsWith("http") ? (row.site_url as string) : `https://${row.site_url}`).host); } catch { continue; }
    const m = (row.metadata ?? {}) as { indexnow_key?: string; indexnow_verified_at?: string };
    if (h === bare && m.indexnow_key && m.indexnow_verified_at) return { id: row.id as string, key: m.indexnow_key };
  }
  return null;
}

/**
 * Notify IndexNow about a newly published URL. Never throws. Returns what happened so
 * callers can log it and the UI can show "IndexNow not connected" where it applies.
 */
export async function notifyIndexNow(admin: SupabaseClient, postUrl: string): Promise<IndexNowResult> {
  let host: string;
  try { host = new URL(postUrl).host; } catch { return { status: "failed", message: "The published URL was not valid." }; }

  if (CREATORSFORGE_HOSTS.has(host.toLowerCase())) {
    return submitToIndexNow({ host, key: CREATORSFORGE_INDEXNOW_KEY, urls: [postUrl] });
  }

  const site = await keyForHost(admin, host);
  if (!site) {
    return {
      status: "not_configured",
      message: "IndexNow is not connected for this website, so search engines will find the post through the sitemap instead. Connecting IndexNow is free.",
    };
  }
  const result = await submitToIndexNow({ host, key: site.key, urls: [postUrl] });
  if (result.httpStatus === 403) {
    // The key file disappeared — flag the site so the dashboard asks the user to fix it.
    const { data: row } = await admin.from("wordpress_sites").select("metadata").eq("id", site.id).maybeSingle();
    const meta = { ...((row?.metadata ?? {}) as Record<string, unknown>), indexnow_verified_at: null, indexnow_error: "Key file not found on the site." };
    await admin.from("wordpress_sites").update({ metadata: meta }).eq("id", site.id);
  }
  return result;
}

/**
 * Does this WordPress site run Rank Math? (Its REST API lists a "rankmath/v1" namespace.)
 * Rank Math has its own Instant Indexing / IndexNow feature, so those sites can paste its key
 * instead of uploading a file. Returns null when the site could not be checked.
 */
export async function detectRankMath(siteUrl: string): Promise<boolean | null> {
  try {
    const base = siteUrl.replace(/\/+$/, "");
    const res = await fetchWithTimeout(`${base}/wp-json/`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CreatorsForgeBot/1.0)" } }, 8_000);
    if (!res.ok) return null;
    const j = (await res.json()) as { namespaces?: string[] };
    return Array.isArray(j.namespaces) ? j.namespaces.some((n) => n.startsWith("rankmath/")) : null;
  } catch {
    return null;
  }
}
