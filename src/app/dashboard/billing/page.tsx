import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Wallet, FileText, CreditCard } from "lucide-react";
import { getBillingOverview } from "@/lib/billing/overview";
import { Card, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BillingWarnings } from "@/components/billing/BillingWarnings";
import { RecommendationsPanel } from "@/components/billing/RecommendationsPanel";

export const metadata = { title: "Billing Overview — CreatorsForge AI" };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardDescription>{label}</CardDescription>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

export default async function BillingOverviewPage() {
  const overview = await getBillingOverview();
  if (!overview) redirect("/login");

  const { wallet, subscription, monthlySpendUsd, nextBillingAmountUsd, usagePct, warnings } = overview;
  const renewal = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : "—";

  return (
    <div className="space-y-6">
      <BillingWarnings warnings={warnings} />

      {/* Current plan card */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardDescription>Current plan</CardDescription>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-2xl font-bold">{subscription.planName}</p>
              <Badge variant={subscription.status === "active" ? "success" : "warning"}>
                {subscription.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {nextBillingAmountUsd != null ? `$${nextBillingAmountUsd}/month · ` : ""}
              {subscription.billingCycle === "one_time" ? "One-time purchase (no auto-renew)" : `${subscription.billingCycle} billing`}
              {subscription.provider ? ` · via ${subscription.provider}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link href="/dashboard/billing/plans">Upgrade Plan</Link></Button>
            <Button asChild variant="outline"><Link href="/dashboard/credits"><Wallet className="h-4 w-4" /> Top Up Credits</Link></Button>
            <Button asChild variant="ghost"><Link href="/dashboard/billing/invoices"><FileText className="h-4 w-4" /> Invoices</Link></Button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Monthly credits used</span>
            <span>{usagePct}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={usagePct} aria-valuemin={0} aria-valuemax={100} aria-label="Monthly credit usage">
            <div
              className={`h-full rounded-full ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-brand-600"}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Credits remaining" value={wallet.creditsRemaining.toLocaleString()} sub={`of ${wallet.monthlyAllowance.toLocaleString()} monthly + extras`} />
        <Stat label="Credits used" value={wallet.usedCredits.toLocaleString()} sub="this period" />
        <Stat label="Renewal / period end" value={renewal} sub={subscription.daysUntilRenewal != null && subscription.daysUntilRenewal >= 0 ? `${subscription.daysUntilRenewal} days left` : undefined} />
        <Stat label="Spending (30 days)" value={`$${monthlySpendUsd.toFixed(2)}`} sub={nextBillingAmountUsd != null ? `next period: $${nextBillingAmountUsd}` : "no upcoming charge"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Purchased credits" value={wallet.purchasedCredits.toLocaleString()} sub="never expire" />
        <Stat label="Bonus credits" value={wallet.bonusCredits.toLocaleString()} />
        <Card>
          <CardDescription>Payment methods</CardDescription>
          <p className="mt-1 text-sm">Crypto is live; card payments arrive with Paddle approval.</p>
          <Link href="/dashboard/billing/payment-methods" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
            <CreditCard className="h-4 w-4" /> Manage <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

      <RecommendationsPanel />
    </div>
  );
}
