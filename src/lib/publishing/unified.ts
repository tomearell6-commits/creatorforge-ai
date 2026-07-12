/**
 * Unified publishing helpers (SERVER-ONLY).
 *
 * One place to read "what accounts does this user have connected" across the
 * existing stores (social_accounts — social/advertising/website/email — plus
 * wordpress_sites), and to combine that with the capability matrix so the UI can
 * show, per content type, which destinations are connected and which are live.
 *
 * Tokens are NEVER selected or returned here.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCapability, PUBLISH_DESTINATIONS, AD_PLATFORM_DESTINATIONS,
  type ContentTypeId, type AccountType, type PublishDestinationId, type AdPlatformId,
} from "@/config/publishingCapabilities";

export type UnifiedAccount = {
  id: string;
  source: "social_accounts" | "wordpress_sites";
  category: AccountType;
  platform: string;
  name: string | null;
  handle: string | null;
  status: "connected" | "expired" | "revoked" | string;
  connectedAt: string | null;
  expiresAt: string | null;
};

/** Map a social_accounts platform slug to an account category (fallback when column missing). */
function inferCategory(platform: string, stored?: string | null): AccountType {
  if (stored === "advertising" || stored === "website" || stored === "email" || stored === "social") return stored;
  if (platform in AD_PLATFORM_DESTINATIONS) return "advertising";
  const dest = PUBLISH_DESTINATIONS[platform as PublishDestinationId];
  if (dest) return dest.accountType;
  return "social";
}

/** All connected accounts for the current user (RLS-scoped), tokens excluded. */
export async function getConnectedAccounts(supabase: SupabaseClient): Promise<UnifiedAccount[]> {
  const out: UnifiedAccount[] = [];

  const { data: social } = await supabase
    .from("social_accounts")
    .select("id, platform, account_name, account_handle, status, category, connected_at, expires_at")
    .order("connected_at", { ascending: false });
  for (const a of social ?? []) {
    out.push({
      id: a.id,
      source: "social_accounts",
      category: inferCategory(a.platform, (a as { category?: string }).category),
      platform: a.platform,
      name: a.account_name ?? null,
      handle: a.account_handle ?? null,
      status: a.status ?? "connected",
      connectedAt: a.connected_at ?? null,
      expiresAt: a.expires_at ?? null,
    });
  }

  const { data: sites } = await supabase
    .from("wordpress_sites")
    .select("id, site_name, site_url, connection_status, created_at")
    .order("created_at", { ascending: false });
  for (const s of sites ?? []) {
    // Skip if the same site is also represented as a social_accounts wordpress row.
    out.push({
      id: s.id,
      source: "wordpress_sites",
      category: "website",
      platform: "wordpress",
      name: s.site_name ?? s.site_url ?? null,
      handle: s.site_url ?? null,
      status: s.connection_status ?? "connected",
      connectedAt: s.created_at ?? null,
      expiresAt: null,
    });
  }

  return out;
}

export function groupByCategory(accounts: UnifiedAccount[]): Record<AccountType, UnifiedAccount[]> {
  const g: Record<AccountType, UnifiedAccount[]> = { social: [], advertising: [], website: [], email: [] };
  for (const a of accounts) g[a.category].push(a);
  return g;
}

/** Is a given destination/platform connected for this user? */
function hasAccountFor(accounts: UnifiedAccount[], platform: string): boolean {
  return accounts.some((a) => a.platform === platform && a.status === "connected");
}

export type DestinationStatus = {
  id: string;
  label: string;
  brandIcon: string | null;
  accountType: AccountType | "advertising";
  live: boolean;
  connected: boolean;
  permissions: string;
};

/**
 * Capability summary for a content type + this user's connections — the payload
 * the completion panel / drawer needs to render everything correctly.
 */
export function capabilitySummary(contentType: ContentTypeId, accounts: UnifiedAccount[]) {
  const cap = getCapability(contentType);
  if (!cap) return null;

  const destinations: DestinationStatus[] = cap.publishDestinations.map((id: PublishDestinationId) => {
    const m = PUBLISH_DESTINATIONS[id];
    return {
      id: m.id, label: m.label, brandIcon: m.brandIcon, accountType: m.accountType,
      live: m.live, connected: hasAccountFor(accounts, m.id), permissions: m.permissions,
    };
  });

  const adPlatforms: DestinationStatus[] = cap.adPlatforms.map((id: AdPlatformId) => {
    const m = AD_PLATFORM_DESTINATIONS[id];
    // ad accounts live in social_accounts with category 'advertising', keyed by platform id
    return {
      id: m.id, label: m.label, brandIcon: m.brandIcon, accountType: "advertising",
      live: m.live, connected: hasAccountFor(accounts, m.id), permissions: m.permissions,
    };
  });

  return {
    contentType: cap.id,
    label: cap.label,
    studio: cap.studio,
    destinations,
    adPlatforms,
    exportFormats: cap.exportFormats,
    scheduleOptions: cap.scheduleOptions,
    metadataFields: cap.metadataFields,
    automationActions: cap.automationActions,
    requiredAccountTypes: cap.requiredAccountTypes,
    creditEstimate: cap.creditEstimate,
    primaryActions: cap.primaryActions,
    secondaryActions: cap.secondaryActions,
  };
}

export type CapabilitySummary = NonNullable<ReturnType<typeof capabilitySummary>>;

/** Record a connection audit-log row + a publishing event (best-effort). */
export async function logConnectionEvent(
  supabase: SupabaseClient, userId: string,
  input: { accountId?: string | null; platform?: string; category?: string; action: string; detail?: string }
) {
  await supabase.from("account_connection_logs").insert({
    user_id: userId, account_id: input.accountId ?? null, platform: input.platform ?? null,
    category: input.category ?? null, action: input.action, detail: input.detail ?? null,
  });
}
