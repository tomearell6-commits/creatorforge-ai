/**
 * Upgrade recommendation engine — deterministic rules over REAL account usage
 * (never invented numbers). Each rule produces a stable rec_key so a
 * recommendation appears once, survives dismissal, and updates in place.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/constants";
import type { WalletSummary } from "@/lib/credits/wallet";
import type { UsageReport } from "@/lib/billing/usage";

export type Recommendation = {
  recKey: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  severity: "info" | "warning" | "critical";
};

/** The next paid tier above the user's current plan (by price). */
export function nextTier(planId: string) {
  const current = PLANS.find((p) => p.id === planId);
  const paid = PLANS.filter((p) => !p.custom && p.price > (current?.price ?? 0)).sort((a, b) => a.price - b.price);
  return paid[0] ?? null;
}

export function computeRecommendations(wallet: WalletSummary, usage: UsageReport): Recommendation[] {
  const recs: Recommendation[] = [];
  const allowance = Math.max(wallet.monthlyAllowance, 1);
  const usedPct = Math.round((wallet.usedCredits / allowance) * 100);
  const next = nextTier(wallet.plan);

  // 1. Heavy overall usage → next tier.
  if (usedPct >= 90 && next) {
    recs.push({
      recKey: "credits-90pct",
      severity: "critical",
      title: `You've used ${Math.min(usedPct, 100)}% of your monthly credits`,
      body: `Upgrade to ${next.name} to get ${next.credits.toLocaleString()} credits every month — ${Math.round(next.credits / allowance)}× your current allowance.`,
      ctaLabel: `Upgrade to ${next.name}`,
      ctaHref: "/dashboard/billing/plans",
    });
  } else if (usedPct >= 70 && next) {
    recs.push({
      recKey: "credits-70pct",
      severity: "warning",
      title: `You've used ${usedPct}% of your monthly credits`,
      body: `At this pace you'll run out before your period ends. ${next.name} includes ${next.credits.toLocaleString()} monthly credits.`,
      ctaLabel: `See ${next.name}`,
      ctaHref: "/dashboard/billing/plans",
    });
  }

  // 2. Dominant category → speak to what they actually do.
  const top = usage.byCategory[0];
  if (top && usage.totalCredits90d >= 50 && top.credits / Math.max(usage.totalCredits90d, 1) >= 0.5 && next) {
    recs.push({
      recKey: `dominant-${top.id}`,
      severity: "info",
      title: `Most of your credits go to ${top.label}`,
      body: `${top.credits.toLocaleString()} of your last ${usage.totalCredits90d.toLocaleString()} credits were spent on ${top.label}. ${next.name} gives you ${next.credits.toLocaleString()} monthly credits so you can produce more without watching the meter.`,
      ctaLabel: "Compare plans",
      ctaHref: "/dashboard/billing/plans",
    });
  }

  // 3. Free plan + real usage → first paid tier.
  if (wallet.plan === "free" && usage.totalCredits90d >= 25) {
    recs.push({
      recKey: "trial-active-user",
      severity: "info",
      title: "You're getting real value from the trial",
      body: "Starter gives you 500 credits monthly, full-quality exports and no watermarks for $19/mo.",
      ctaLabel: "Upgrade to Starter",
      ctaHref: "/dashboard/billing/plans",
    });
  }

  // 4. Purchased top-ups repeatedly → subscription is cheaper.
  if (wallet.purchasedCredits >= allowance && wallet.plan !== "agency" && next) {
    recs.push({
      recKey: "topups-exceed-plan",
      severity: "info",
      title: "Your top-ups exceed your plan allowance",
      body: `You've purchased ${wallet.purchasedCredits.toLocaleString()} extra credits. ${next.name} includes ${next.credits.toLocaleString()} credits every month — usually better value than repeated top-ups.`,
      ctaLabel: `Compare with ${next.name}`,
      ctaHref: "/dashboard/billing/plans",
    });
  }

  return recs;
}

/** Persist current recommendations (upsert per rec_key; dismissed ones stay dismissed). */
export async function syncRecommendations(userId: string, recs: Recommendation[]): Promise<void> {
  const admin = createAdminClient();
  for (const r of recs) {
    await admin.from("upgrade_recommendations").upsert(
      {
        user_id: userId,
        rec_key: r.recKey,
        title: r.title,
        body: r.body,
        cta_label: r.ctaLabel,
        cta_href: r.ctaHref,
        severity: r.severity,
      },
      { onConflict: "user_id,rec_key", ignoreDuplicates: false }
    );
  }
}
