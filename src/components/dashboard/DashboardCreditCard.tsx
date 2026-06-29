import Link from "next/link";
import { Wallet, Plus, AlertTriangle, Gift, ShoppingBag, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { WalletSummary } from "@/lib/credits/wallet";
import { formatDate } from "@/lib/utils";

const BAR: Record<string, string> = {
  ok: "bg-brand-500", low: "bg-amber-500", critical: "bg-red-500", empty: "bg-red-600",
};

/** Top-of-dashboard wallet snapshot: plan, remaining, breakdown, usage bar, top-up. */
export function DashboardCreditCard({ summary }: { summary: WalletSummary }) {
  const pct = Math.round(summary.remainingFraction * 100);
  const warn = summary.warnLevel;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-brand-600" />
          <div>
            <p className="text-sm text-muted-foreground">Credit Wallet</p>
            <p className="text-2xl font-bold">
              {summary.creditsRemaining.toLocaleString()}{" "}
              <span className="text-sm font-normal text-muted-foreground">credits remaining</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
            {summary.planName} plan
          </span>
          <Button asChild variant="accent" size="sm">
            <Link href="/dashboard/credits"><Plus className="h-4 w-4" /> Top Up Credits</Link>
          </Button>
        </div>
      </div>

      {/* Usage progress bar */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>{summary.usedCredits.toLocaleString()} used</span>
          <span>{pct}% of monthly allowance left</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full transition-all ${BAR[warn]}`} style={{ width: `${Math.max(pct, 2)}%` }} />
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<RefreshCw className="h-4 w-4" />} label="Monthly" value={summary.monthlyRemaining} />
        <Stat icon={<Gift className="h-4 w-4" />} label="Bonus" value={summary.bonusCredits} />
        <Stat icon={<ShoppingBag className="h-4 w-4" />} label="Purchased" value={summary.purchasedCredits} />
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Renews</p>
          <p className="mt-0.5 text-sm font-semibold">
            {summary.renewalDate ? formatDate(summary.renewalDate) : "—"}
          </p>
        </div>
      </div>

      {warn !== "ok" && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
          warn === "empty" || warn === "critical"
            ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {warn === "empty"
            ? "You're out of credits. Generation is paused — top up to continue (editing & browsing stay available)."
            : warn === "critical"
            ? "Credits are very low (under 10%). Consider topping up to avoid interruptions."
            : "Credits are running low (under 20%)."}
          <Link href="/dashboard/credits" className="ml-auto font-semibold underline">Top up</Link>
        </div>
      )}
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">{icon} {label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
