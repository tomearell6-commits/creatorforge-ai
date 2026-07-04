import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, TrendingUp, History, Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWalletSummary } from "@/lib/credits/wallet";
import { buildUsageReport } from "@/lib/billing/usage";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Credits — Billing — CreatorsForge AI" };

export default async function BillingCreditsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [wallet, usage] = await Promise.all([getWalletSummary(), buildUsageReport(user.id)]);
  if (!wallet) redirect("/login");

  // Estimated days remaining from the last-30-day average burn rate.
  const last30 = usage.daily.reduce((s, d) => s + d.credits, 0);
  const avgDaily = last30 / 30;
  const daysRemaining = avgDaily > 0 ? Math.floor(wallet.creditsRemaining / avgDaily) : null;

  const stats: { label: string; value: string; sub?: string }[] = [
    { label: "Credits remaining", value: wallet.creditsRemaining.toLocaleString() },
    { label: "Credits used (this period)", value: wallet.usedCredits.toLocaleString() },
    { label: "Purchased credits", value: wallet.purchasedCredits.toLocaleString(), sub: "never expire" },
    { label: "Monthly credits", value: wallet.monthlyAllowance.toLocaleString(), sub: wallet.planName },
    { label: "Bonus credits", value: wallet.bonusCredits.toLocaleString() },
    {
      label: "Estimated days remaining",
      value: daysRemaining === null ? "∞" : String(daysRemaining),
      sub: avgDaily > 0 ? `at ~${Math.ceil(avgDaily)} credits/day (30-day average)` : "no recent usage",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardDescription>{s.label}</CardDescription>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
            {s.sub && <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>}
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Credit Wallet</CardTitle>
        <CardDescription className="mt-1">
          Top-ups, purchase history and the credit calculator live in your full wallet.
        </CardDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild><Link href="/dashboard/credits"><Wallet className="h-4 w-4" /> Top Up Credits</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/billing/usage"><TrendingUp className="h-4 w-4" /> View Usage</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/billing/history"><History className="h-4 w-4" /> Usage History</Link></Button>
          <Button asChild variant="ghost"><Link href="/dashboard/credits#calculator"><Calculator className="h-4 w-4" /> Credit Calculator</Link></Button>
        </div>
      </Card>
    </div>
  );
}
