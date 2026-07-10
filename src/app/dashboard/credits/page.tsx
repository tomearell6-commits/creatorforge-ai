import Link from "next/link";
import { CreditCard } from "lucide-react";
import { WalletClient } from "@/components/dashboard/WalletClient";
import { FlutterwaveTopupCard } from "@/components/dashboard/FlutterwaveTopupCard";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Credit Wallet — CreatorsForge AI" };

export default function CreditsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Credit Wallet</h1>
          <p className="mt-1 text-muted-foreground">
            Top up instantly with crypto, card, or Mobile Money. Purchased credits never expire and stack on top of your monthly plan.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/billing"><CreditCard className="h-4 w-4" /> Subscription &amp; Billing</Link>
        </Button>
      </div>
      <FlutterwaveTopupCard />
      <WalletClient />
    </div>
  );
}
