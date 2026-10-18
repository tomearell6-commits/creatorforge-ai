import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptSecret, decryptSecret } from "@/lib/security/secrets";
import { fetchWithTimeout } from "@/lib/http";
import type { GscProperty, GscRow } from "./overview";

/**
 * Google Search Console, read-only. Which Google client it signs in with, first one set wins:
 * GSC_CLIENT_ID/SECRET, then the Google Business Profile client (GOOGLE_BUSINESS_CLIENT_ID/SECRET), then the
 * YouTube client. The redirect address and the Search Console permission must be set on THAT client's project. Scope: webmasters.readonly: it can read results and inspect URLs, never change anything.
 */
export const GSC_SCOPE = "openid email https://www.googleapis.com/auth/webmasters.readonly";

const clientId = () => process.env.GSC_CLIENT_ID || process.env.GOOGLE_BUSINESS_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || "";
const clientSecret = () => process.env.GSC_CLIENT_SECRET || process.env.GOOGLE_BUSINESS_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || "";
/** The Google Cloud project number (the digits before the first dash of the client id). Not a secret; shown so the right project can be checked. */
export const gscProjectNumber = () => clientId().split("-")[0] || null;
export const gscConfigured = () => !!clientId() && !!clientSecret();
export const gscRedirectUri = () => `${process.env.NEXT_PUBLIC_APP_URL || "https://www.creatorsforge.io"}/api/seo/gsc/callback`;

export function authorizeUrl(state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", gscRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GSC_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "false");
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenReply = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string; error_description?: string };

export async function exchangeCode(code: string): Promise<TokenReply> {
  const res = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId(), client_secret: clientSecret(), redirect_uri: gscRedirectUri(), grant_type: "authorization_code" }),
  }, 20_000);
  return (await res.json().catch(() => ({}))) as TokenReply;
}

export async function accountEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } }, 10_000);
    return res.ok ? ((await res.json()) as { email?: string }).email ?? null : null;
  } catch { return null; }
}

export type Connection = {
  id: string; user_id: string; google_email: string; refresh_token: string;
  access_token: string | null; expires_at: string | null; status: string;
};

/** A fresh access token for a connection, refreshing (and recording it) when needed. */
export async function tokenFor(admin: SupabaseClient, c: Connection): Promise<{ token: string } | { error: string }> {
  const cached = decryptSecret(c.access_token);
  if (cached && c.expires_at && new Date(c.expires_at).getTime() - 60_000 > Date.now()) return { token: cached };
  const refresh = decryptSecret(c.refresh_token);
  if (!refresh) return { error: "The saved Google login could not be read. Please reconnect." };
  try {
    const res = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), refresh_token: refresh, grant_type: "refresh_token" }),
    }, 20_000);
    const tok = (await res.json().catch(() => ({}))) as TokenReply;
    if (!res.ok || !tok.access_token) {
      const why = tok.error === "invalid_grant"
        ? "Google no longer accepts this connection (it expired or was revoked). Please reconnect."
        : tok.error_description || tok.error || "Google refused to refresh the connection.";
      await admin.from("gsc_connections").update({ status: "expired", last_error: why, updated_at: new Date().toISOString() }).eq("id", c.id);
      return { error: why };
    }
    const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
    await admin.from("gsc_connections").update({ access_token: encryptSecret(tok.access_token), expires_at: expiresAt, status: "connected", last_error: null, updated_at: new Date().toISOString() }).eq("id", c.id);
    return { token: tok.access_token };
  } catch {
    return { error: "Could not reach Google. Please try again in a moment." };
  }
}

async function gjson<T>(token: string, url: string, init?: RequestInit, timeoutMs = 30_000): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  try {
    const res = await fetchWithTimeout(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } }, timeoutMs);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = (body as { error?: { message?: string; status?: string } }).error;
      return { ok: false, status: res.status, message: e?.message || e?.status || `Google answered HTTP ${res.status}` };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, message: "Could not reach Google." };
  }
}

export async function listProperties(token: string) {
  return gjson<{ siteEntry?: GscProperty[] }>(token, "https://www.googleapis.com/webmasters/v3/sites");
}

export type QueryBody = { startDate: string; endDate: string; dimensions?: string[]; rowLimit?: number; dataState?: "all" | "final" };

export async function queryAnalytics(token: string, property: string, body: QueryBody) {
  return gjson<{ rows?: GscRow[] }>(token, `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
    method: "POST", body: JSON.stringify({ dataState: "all", ...body }),
  });
}

export type Inspection = { verdict: string; state: string; lastCrawl: string | null; indexed: boolean };

/** Whether Google has this page in its index (URL Inspection API). */
export async function inspectUrl(token: string, property: string, url: string, timeoutMs = 15_000) {
  const r = await gjson<{ inspectionResult?: { indexStatusResult?: { verdict?: string; coverageState?: string; lastCrawlTime?: string } } }>(
    token, "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    { method: "POST", body: JSON.stringify({ inspectionUrl: url, siteUrl: property, languageCode: "en-US" }) },
    timeoutMs,
  );
  if (!r.ok) return r;
  const s = r.data.inspectionResult?.indexStatusResult;
  const verdict = s?.verdict ?? "UNKNOWN";
  return { ok: true as const, data: { verdict, state: s?.coverageState ?? "Unknown", lastCrawl: s?.lastCrawlTime ?? null, indexed: verdict === "PASS" } satisfies Inspection };
}

/** Cached answers: Search Console data changes slowly and its quota is limited. */
export async function cacheGet<T>(admin: SupabaseClient, userId: string, kind: string, key: string, maxAgeMs: number): Promise<T | null> {
  const { data } = await admin.from("gsc_cache").select("payload, fetched_at").eq("user_id", userId).eq("kind", kind).eq("cache_key", key).maybeSingle();
  if (!data) return null;
  return Date.now() - new Date(data.fetched_at as string).getTime() <= maxAgeMs ? (data.payload as T) : null;
}
export async function cacheSet(admin: SupabaseClient, userId: string, kind: string, key: string, payload: unknown) {
  await admin.from("gsc_cache").upsert({ user_id: userId, kind, cache_key: key, payload, fetched_at: new Date().toISOString() }, { onConflict: "user_id,kind,cache_key" });
}
