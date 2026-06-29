import { WalletClient } from "@/components/dashboard/WalletClient";

export const metadata = { title: "Credit Wallet — CreatorForge AI" };

export default function CreditsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Credit Wallet</h1>
        <p className="mt-1 text-muted-foreground">
          Top up instantly with crypto. Purchased credits never expire and stack on top of your monthly plan.
        </p>
      </div>
      <WalletClient />
    </div>
  );
}
