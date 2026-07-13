/**
 * Social Business Studio server helpers (SERVER-ONLY). Reuses the existing
 * social_accounts store (Phase 6) for connections + credits. Tokens never leave
 * the server.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCreditBalance, deductCredits } from "@/lib/credits";

export type SocialAccountView = {
  id: string; provider: string; account_name: string | null; account_handle: string | null;
  status: string; expires_at: string | null; last_synced_at: string | null; connected_at: string;
};

/** Connected social accounts for the current user (tokens excluded, RLS-scoped). */
export async function getSocialAccounts(supabase: SupabaseClient): Promise<SocialAccountView[]> {
  const { data } = await supabase
    .from("social_accounts")
    .select("id, platform, account_name, account_handle, status, expires_at, last_synced_at, connected_at")
    .order("connected_at", { ascending: false });
  return (data ?? []).map((a) => ({
    id: a.id, provider: a.platform, account_name: a.account_name, account_handle: a.account_handle,
    status: a.status ?? "connected", expires_at: a.expires_at, last_synced_at: a.last_synced_at, connected_at: a.connected_at,
  }));
}

export async function logSocialConnection(supabase: SupabaseClient, userId: string, accountId: string | null, provider: string | null, action: string, detail?: string) {
  await supabase.from("social_connection_logs").insert({ user_id: userId, account_id: accountId, provider, action, detail: detail ?? null });
}

export type SocialCharge = { ok: true; charged: number; balance: number } | { ok: false; code: "insufficient_credits"; required: number; balance: number };

/** Pre-check + charge credits for a Social Business action. */
export async function chargeSocial(cost: number, reason: string): Promise<SocialCharge> {
  const balance = await getCreditBalance();
  if (balance < cost) return { ok: false, code: "insufficient_credits", required: cost, balance };
  const nb = await deductCredits(cost, `social_${reason}`);
  if (nb === null) return { ok: false, code: "insufficient_credits", required: cost, balance };
  return { ok: true, charged: cost, balance: nb };
}
