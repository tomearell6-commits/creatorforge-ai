/**
 * Google Business Profile API client (SERVER-ONLY).
 *
 * Real integration with Google's Business Profile APIs — parity with the other
 * live publishers (YouTube/Facebook/Instagram). Handles OAuth token refresh,
 * live location sync, and local-post creation. NEVER simulates success: every
 * function returns an honest result and callers only mark work "published" on a
 * confirmed API response.
 *
 * Gated by `gbpApiConfigured()` at the route layer: live reads/writes also need
 * Google's approved access to the Business Profile APIs (a Google allowlist,
 * separate from OAuth). Until that's granted, calls return real Google errors
 * (typically 403 PERMISSION_DENIED) — which we surface, never hide.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "@/lib/security/secrets";
import { fetchWithTimeout } from "@/lib/http";
import { lbPostTypeLabel, type LbPostType } from "@/config/localBusiness";

const ACCOUNTS_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const INFO_API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const POSTS_API = "https://mybusiness.googleapis.com/v4"; // localPosts still live on v4

type AccountRow = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

/**
 * Return a valid (fresh) Google access token for a connected account, refreshing
 * via the stored refresh token when expired. Persists the new token + expiry.
 * Returns null when no usable token exists (caller should mark reconnect needed).
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  account: AccountRow
): Promise<string | null> {
  const current = decryptSecret(account.access_token ?? null);
  const notExpired = account.expires_at ? new Date(account.expires_at).getTime() - 60_000 > Date.now() : false;
  if (current && notExpired) return current;

  const refresh = decryptSecret(account.refresh_token ?? null);
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;
  if (!refresh || !clientId || !clientSecret) return current ?? null;

  try {
    const res = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refresh, grant_type: "refresh_token" }),
    }, 20_000);
    const tok = await res.json();
    if (!res.ok || !tok.access_token) {
      await supabase.from("local_business_accounts")
        .update({ status: "expired", last_error_at: new Date().toISOString(), last_error: tok.error_description ?? tok.error ?? "token refresh failed" })
        .eq("id", account.id);
      return current ?? null;
    }
    const expiresAt = tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null;
    await supabase.from("local_business_accounts")
      .update({ access_token: encryptSecret(tok.access_token), expires_at: expiresAt, status: "connected", last_success_at: new Date().toISOString(), last_synced_at: new Date().toISOString() })
      .eq("id", account.id);
    return tok.access_token as string;
  } catch {
    return current ?? null;
  }
}

export type GbpLocation = {
  /** Full v4 resource path: accounts/{a}/locations/{l} — used for localPosts. */
  providerLocationId: string;
  businessName: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  primaryCategory: string | null;
};

type GoogleError = { error?: { message?: string; status?: string; code?: number } };

/** List all Business Profile accounts the token can access (accounts/{id}). */
async function listAccounts(token: string): Promise<{ names: string[]; error?: string }> {
  const res = await fetchWithTimeout(`${ACCOUNTS_API}/accounts?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }, 20_000);
  const j = (await res.json()) as GoogleError & { accounts?: Array<{ name: string }> };
  if (!res.ok) return { names: [], error: j.error?.message ?? `accounts ${res.status}` };
  return { names: (j.accounts ?? []).map((a) => a.name).filter(Boolean) };
}

/** List locations for one account, normalized. */
async function listLocationsForAccount(token: string, accountName: string): Promise<{ locations: GbpLocation[]; error?: string }> {
  const readMask = "name,title,storefrontAddress,phoneNumbers,websiteUri,categories";
  const url = `${INFO_API}/${accountName}/locations?readMask=${encodeURIComponent(readMask)}&pageSize=100`;
  const res = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${token}` } }, 25_000);
  const j = (await res.json()) as GoogleError & {
    locations?: Array<{
      name: string; title?: string;
      storefrontAddress?: { addressLines?: string[]; locality?: string; administrativeArea?: string; postalCode?: string };
      phoneNumbers?: { primaryPhone?: string };
      websiteUri?: string;
      categories?: { primaryCategory?: { displayName?: string } };
    }>;
  };
  if (!res.ok) return { locations: [], error: j.error?.message ?? `locations ${res.status}` };

  const locations: GbpLocation[] = (j.locations ?? []).map((loc) => {
    const a = loc.storefrontAddress;
    const address = a
      ? [...(a.addressLines ?? []), a.locality, a.administrativeArea, a.postalCode].filter(Boolean).join(", ")
      : null;
    return {
      // loc.name is "locations/{id}"; combine with account to get the v4 parent.
      providerLocationId: `${accountName}/${loc.name}`,
      businessName: loc.title || "Business location",
      address: address || null,
      phone: loc.phoneNumbers?.primaryPhone ?? null,
      website: loc.websiteUri ?? null,
      primaryCategory: loc.categories?.primaryCategory?.displayName ?? null,
    };
  });
  return { locations };
}

/**
 * Fetch every location across every account for a token. Aggregates errors so a
 * single account failure doesn't hide the rest.
 */
export async function fetchAllLocations(token: string): Promise<{ locations: GbpLocation[]; error?: string }> {
  const acc = await listAccounts(token);
  if (acc.error && !acc.names.length) return { locations: [], error: acc.error };
  const all: GbpLocation[] = [];
  const errors: string[] = [];
  for (const name of acc.names) {
    const r = await listLocationsForAccount(token, name);
    if (r.error) errors.push(r.error);
    all.push(...r.locations);
  }
  return { locations: all, error: all.length === 0 && errors.length ? errors[0] : undefined };
}

/**
 * Sync live locations for one connected account into local_business_locations.
 * Upserts by provider_location_id (no duplicates). Best-effort; returns a count
 * or an honest error. Used after connect and by the "Sync from Google" action.
 */
export async function syncLocationsForAccount(
  supabase: SupabaseClient, userId: string, account: AccountRow
): Promise<{ ok: boolean; synced: number; error?: string }> {
  const token = await getValidAccessToken(supabase, account);
  if (!token) return { ok: false, synced: 0, error: "Google authorization expired — reconnect the account." };

  const { locations, error } = await fetchAllLocations(token);
  if (error) return { ok: false, synced: 0, error };

  const { data: existing } = await supabase
    .from("local_business_locations")
    .select("id, provider_location_id")
    .eq("account_id", account.id);
  const byProvider = new Map((existing ?? []).map((r) => [r.provider_location_id, r.id]));

  let synced = 0;
  for (const loc of locations) {
    const base = {
      business_name: loc.businessName, address: loc.address, phone: loc.phone, website: loc.website,
      primary_category: loc.primaryCategory, connection_status: "connected",
      last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const id = byProvider.get(loc.providerLocationId);
    const res = id
      ? await supabase.from("local_business_locations").update(base).eq("id", id)
      : await supabase.from("local_business_locations").insert({ user_id: userId, account_id: account.id, provider_location_id: loc.providerLocationId, profile_status: "needs_attention", ...base });
    if (!res.error) synced += 1;
  }

  await supabase.from("local_business_accounts")
    .update({ last_synced_at: new Date().toISOString(), last_success_at: new Date().toISOString() })
    .eq("id", account.id);
  return { ok: true, synced };
}

// Map a CreatorsForge post CTA to a Google callToAction action type.
function ctaActionType(cta: string | null): string | null {
  if (!cta) return null;
  const t = cta.toLowerCase();
  if (/book|appointment|reserve/.test(t)) return "BOOK";
  if (/order/.test(t)) return "ORDER";
  if (/buy|shop|store/.test(t)) return "SHOP";
  if (/sign\s?up|subscribe|join/.test(t)) return "SIGN_UP";
  if (/call|phone/.test(t)) return "CALL";
  return "LEARN_MORE";
}

export type GbpPostInput = {
  providerLocationId: string; // accounts/{a}/locations/{l}
  postType: LbPostType | string;
  mainText: string;
  cta: string | null;
  ctaUrl: string | null; // website / appointment link for the button
  imageUrl: string | null;
};

/**
 * Create a Google Business Profile local post (v4 localPosts.create). Posts as a
 * STANDARD "What's new" update with optional call-to-action and photo — the
 * universally-valid shape. Returns the created post's search URL on success.
 */
export async function createLocalPost(
  token: string, input: GbpPostInput
): Promise<{ ok: boolean; url?: string | null; error?: string }> {
  const summary = (input.mainText || lbPostTypeLabel(input.postType as LbPostType)).slice(0, 1500);
  const body: Record<string, unknown> = { languageCode: "en-US", summary, topicType: "STANDARD" };

  const action = ctaActionType(input.cta);
  if (action) {
    // CALL uses the profile's phone (no url); every other action needs a url.
    body.callToAction = action === "CALL"
      ? { actionType: "CALL" }
      : input.ctaUrl ? { actionType: action, url: input.ctaUrl } : undefined;
    if (!body.callToAction) delete body.callToAction;
  }
  if (input.imageUrl) body.media = [{ mediaFormat: "PHOTO", sourceUrl: input.imageUrl }];

  try {
    const res = await fetchWithTimeout(`${POSTS_API}/${input.providerLocationId}/localPosts`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, 30_000);
    const j = (await res.json()) as GoogleError & { name?: string; searchUrl?: string; state?: string };
    if (!res.ok) return { ok: false, error: j.error?.message ? `Google Business Profile: ${j.error.message}` : `Google Business Profile ${res.status}` };
    return { ok: true, url: j.searchUrl ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Google Business Profile publish failed" };
  }
}
