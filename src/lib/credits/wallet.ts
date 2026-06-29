/**
 * Credit Wallet — server-side helpers.
 *
 * profiles.credits is the authoritative spendable balance; the wallet layer adds
 * the monthly/bonus/purchased breakdown (cached in credit_wallets, sourced from
 * the append-only credit_ledger). ALL balances are computed server-side — never
 * trust a client-supplied number.
 */
import { createClient } from "@/lib/supabase/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import {
  planCredits, CREDITS_PER_USD, MIN_PURCHASE_USD, MAX_PURCHASE_USD,
  PROCESSING_FEE_PCT, WALLET_WARN_FRACTION, WALLET_CRITICAL_FRACTION, PLANS,
} from "@/lib/constants";

export type WarnLevel = "ok" | "low" | "critical" | "empty";

export type WalletSummary = {
  plan: string;
  planName: string;
  monthlyAllowance: number;
  monthlyRemaining: number;
  bonusCredits: number;
  purchasedCredits: number;
  usedCredits: number;
  /** Authoritative spendable total (profiles.credits). */
  creditsRemaining: number;
  renewalDate: string | null;
  warnLevel: WarnLevel;
  /** 0..1 fraction of the monthly allowance still available (for the progress bar). */
  remainingFraction: number;
};

function warn(remaining: number, allowance: number): WarnLevel {
  if (remaining <= 0) return "empty";
  const base = Math.max(allowance, 1);
  const f = remaining / base;
  if (f < WALLET_CRITICAL_FRACTION) return "critical";
  if (f < WALLET_WARN_FRACTION) return "low";
  return "ok";
}

/** Build the authoritative wallet summary for the signed-in user. */
export async function getWalletSummary(): Promise<WalletSummary | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Lazily ensure a wallet row exists (idempotent SECURITY DEFINER fn).
  await supabase.rpc("wallet_ensure", { p_user: user.id });

  const [{ data: profile }, { data: wallet }] = await Promise.all([
    supabase.from("profiles").select("plan, credits").eq("user_id", user.id).single(),
    supabase.from("credit_wallets")
      .select("monthly_credits, bonus_credits, purchased_credits, used_credits, renewal_date")
      .eq("user_id", user.id).maybeSingle(),
  ]);

  const plan = profile?.plan ?? "free";
  const allowance = planCredits(plan);
  const remaining = profile?.credits ?? 0;

  return {
    plan,
    planName: PLANS.find((p) => p.id === plan)?.name ?? plan,
    monthlyAllowance: allowance,
    monthlyRemaining: wallet?.monthly_credits ?? Math.min(remaining, allowance),
    bonusCredits: wallet?.bonus_credits ?? 0,
    purchasedCredits: wallet?.purchased_credits ?? 0,
    usedCredits: wallet?.used_credits ?? 0,
    creditsRemaining: remaining,
    renewalDate: wallet?.renewal_date ?? null,
    warnLevel: warn(remaining, allowance),
    remainingFraction: Math.min(1, remaining / Math.max(allowance, 1)),
  };
}

/** Price a top-up. Accepts either a USD amount or a desired credit amount. */
export function quoteCustom(input: { usd?: number; credits?: number }): {
  ok: boolean; error?: string; usd: number; credits: number; fee: number; total: number;
} {
  let usd = input.usd ?? 0;
  if (input.credits && !input.usd) usd = input.credits / CREDITS_PER_USD;
  usd = Math.round(usd * 100) / 100;

  if (usd < MIN_PURCHASE_USD) return { ok: false, error: `Minimum purchase is $${MIN_PURCHASE_USD}.`, usd, credits: 0, fee: 0, total: 0 };
  if (usd > MAX_PURCHASE_USD) return { ok: false, error: `Maximum purchase is $${MAX_PURCHASE_USD}.`, usd, credits: 0, fee: 0, total: 0 };

  const credits = Math.floor(usd * CREDITS_PER_USD);
  const fee = Math.round(usd * PROCESSING_FEE_PCT) / 100;
  const total = Math.round((usd + fee) * 100) / 100;
  return { ok: true, usd, credits, fee, total };
}

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Grant credits to a user from a trusted server context (webhook / admin), via
 * the SECURITY DEFINER wallet_credit() function. Idempotency must be enforced by
 * the caller (e.g. unique charge id) BEFORE calling this.
 */
export async function creditWalletAdmin(
  admin: Admin,
  userId: string,
  amount: number,
  bucket: "monthly" | "bonus" | "purchased",
  type: string,
  reason?: string,
  reference?: string,
): Promise<number | null> {
  const { data, error } = await admin.rpc("wallet_credit", {
    p_user: userId, p_amount: amount, p_bucket: bucket,
    p_type: type, p_reason: reason ?? null, p_reference: reference ?? null,
  });
  if (error) { console.error("wallet_credit failed:", error.message); return null; }
  return data as number | null;
}

/** Insert a notification row (admin/webhook context). Best-effort. */
export async function notifyWallet(
  admin: Admin, userId: string, type: string, title: string, body?: string,
): Promise<void> {
  await admin.from("wallet_notifications").insert({ user_id: userId, type, title, body: body ?? null });
}
