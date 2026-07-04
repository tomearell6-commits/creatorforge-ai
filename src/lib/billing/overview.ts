/**
 * Billing overview builder — the single source of truth the Overview page and
 * /api/billing/overview render. Composes the Credit Wallet summary with the
 * subscription row, spending, warnings and next-billing info.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWalletSummary, type WalletSummary } from "@/lib/credits/wallet";
import { PLANS } from "@/lib/constants";
import { CREDIT_WARN_LEVELS, EXPIRY_WARN_DAYS } from "@/config/billing";

export type BillingWarning = {
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  actions: { label: string; href: string }[];
};

export type BillingOverview = {
  wallet: WalletSummary;
  subscription: {
    planId: string;
    planName: string;
    status: string;
    billingCycle: string;
    provider: string | null;
    startedAt: string | null;
    currentPeriodEnd: string | null;
    daysUntilRenewal: number | null;
  };
  monthlySpendUsd: number;
  nextBillingAmountUsd: number | null;
  usagePct: number; // 0..100 of monthly allowance used
  warnings: BillingWarning[];
};

/**
 * Ensure a subscriptions row exists and mirror profiles.plan into it.
 * The base-schema table allows multiple rows per user (Paddle sub ids), so we
 * work with the LATEST row.
 */
export async function ensureSubscription(userId: string, plan: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("subscriptions").select("id, plan")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!existing) {
    await admin.from("subscriptions").insert({ user_id: userId, plan, billing_cycle: "monthly" });
  } else if (existing.plan !== plan) {
    await admin.from("subscriptions")
      .update({ plan, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  }
}

export async function getBillingOverview(): Promise<BillingOverview | null> {
  const wallet = await getWalletSummary();
  if (!wallet) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureSubscription(user.id, wallet.plan);

  const [{ data: sub }, { data: purchases }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan, status, billing_cycle, provider, started_at, current_period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("credit_purchases")
      .select("usd_amount, created_at, status")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
  ]);

  const plan = PLANS.find((p) => p.id === wallet.plan);
  const monthlySpendUsd = (purchases ?? []).reduce((sum, p) => sum + Number(p.usd_amount ?? 0), 0);

  const periodEnd = sub?.current_period_end ?? wallet.renewalDate;
  const daysUntilRenewal = periodEnd
    ? Math.ceil((new Date(periodEnd).getTime() - Date.now()) / 864e5)
    : null;

  const allowance = Math.max(wallet.monthlyAllowance, 1);
  const usagePct = Math.min(100, Math.round((wallet.usedCredits / allowance) * 100));

  return {
    wallet,
    subscription: {
      planId: wallet.plan,
      planName: wallet.planName,
      status: sub?.status ?? "active",
      billingCycle: sub?.billing_cycle ?? "one_time",
      provider: sub?.provider ?? null,
      startedAt: sub?.started_at ?? null,
      currentPeriodEnd: periodEnd,
      daysUntilRenewal,
    },
    monthlySpendUsd: Math.round(monthlySpendUsd * 100) / 100,
    nextBillingAmountUsd: plan && plan.price > 0 ? plan.price : null,
    usagePct,
    warnings: buildWarnings(wallet, daysUntilRenewal),
  };
}

/** Low-credit (30/15/5%) + expiry (30/14/7/3/1 day) warnings with actions. */
export function buildWarnings(wallet: WalletSummary, daysUntilRenewal: number | null): BillingWarning[] {
  const warnings: BillingWarning[] = [];
  const allowance = Math.max(wallet.monthlyAllowance, 1);
  const fraction = wallet.creditsRemaining / allowance;

  const level = CREDIT_WARN_LEVELS.find((l) => fraction < l.fraction);
  if (level) {
    warnings.push({
      severity: level.severity,
      title:
        wallet.creditsRemaining <= 0
          ? "You're out of credits"
          : `Credits ${level.label} of your monthly allowance`,
      body: `${wallet.creditsRemaining.toLocaleString()} of ${allowance.toLocaleString()} credits remaining. Top up or upgrade so your work never stops.`,
      actions: [
        { label: "Top Up", href: "/dashboard/credits" },
        { label: "Upgrade", href: "/dashboard/billing/plans" },
      ],
    });
  }

  if (daysUntilRenewal !== null && daysUntilRenewal >= 0) {
    const threshold = EXPIRY_WARN_DAYS.find((d) => daysUntilRenewal <= d);
    if (threshold) {
      warnings.push({
        severity: daysUntilRenewal <= 3 ? "critical" : daysUntilRenewal <= 7 ? "warning" : "info",
        title:
          daysUntilRenewal === 0
            ? "Your plan credits renew/expire today"
            : `Your plan period ends in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? "" : "s"}`,
        body: "Crypto plan purchases are one-time and don't auto-renew — renew before your period ends to keep your monthly credits flowing.",
        actions: [
          { label: "Renew", href: "/dashboard/billing/plans" },
          { label: "Top Up", href: "/dashboard/credits" },
        ],
      });
    }
  }

  return warnings;
}
