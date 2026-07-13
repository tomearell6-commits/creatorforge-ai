/**
 * Local Business Studio server helpers (SERVER-ONLY). Reuses credits, secret
 * encryption, and the owner-RLS supabase client. Google tokens never leave the
 * server; live GBP API calls are gated behind Business Profile API approval.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { LB_CREDIT_COSTS, type LbCreditAction } from "@/config/localBusiness";

export type LbAccount = {
  id: string; google_email: string | null; provider_account_id: string | null;
  status: string; expires_at: string | null; last_synced_at: string | null;
  last_success_at: string | null; last_error_at: string | null; connected_at: string;
};
export type LbLocation = {
  id: string; account_id: string | null; provider_location_id: string | null;
  business_name: string; address: string | null; phone: string | null; website: string | null;
  primary_category: string | null; description: string | null; profile_status: string;
  audit_score: number | null; connection_status: string; last_post_at: string | null; last_synced_at: string | null;
};

/** Whether live Google Business Profile API access is configured on the server. */
export function gbpApiConfigured(): boolean {
  return !!process.env.GOOGLE_BUSINESS_CLIENT_ID && !!process.env.GOOGLE_BUSINESS_API_ENABLED;
}

/** List connected Google accounts (tokens excluded). */
export async function getLbAccounts(supabase: SupabaseClient): Promise<LbAccount[]> {
  const { data } = await supabase
    .from("local_business_accounts")
    .select("id, google_email, provider_account_id, status, expires_at, last_synced_at, last_success_at, last_error_at, connected_at")
    .order("connected_at", { ascending: false });
  return (data as LbAccount[]) ?? [];
}

/** List locations, optionally scoped to one account. */
export async function getLbLocations(supabase: SupabaseClient, accountId?: string): Promise<LbLocation[]> {
  let q = supabase
    .from("local_business_locations")
    .select("id, account_id, provider_location_id, business_name, address, phone, website, primary_category, description, profile_status, audit_score, connection_status, last_post_at, last_synced_at")
    .order("created_at", { ascending: false });
  if (accountId) q = q.eq("account_id", accountId);
  const { data } = await q;
  return (data as LbLocation[]) ?? [];
}

export async function logLbConnection(
  supabase: SupabaseClient, userId: string, accountId: string | null, action: string, detail?: string
) {
  await supabase.from("local_business_connection_logs").insert({ user_id: userId, account_id: accountId, action, detail: detail ?? null });
}

export type ChargeResult = { ok: true; charged: number; balance: number } | { ok: false; code: "insufficient_credits"; required: number; balance: number };

/** Pre-check + charge credits for a Local Business action. */
export async function chargeLb(action: LbCreditAction, extraUnits = 0): Promise<ChargeResult> {
  const cost = LB_CREDIT_COSTS[action] * (1 + extraUnits);
  const balance = await getCreditBalance();
  if (balance < cost) return { ok: false, code: "insufficient_credits", required: cost, balance };
  const nb = await deductCredits(cost, `local_business_${action}`);
  if (nb === null) return { ok: false, code: "insufficient_credits", required: cost, balance };
  return { ok: true, charged: cost, balance: nb };
}
