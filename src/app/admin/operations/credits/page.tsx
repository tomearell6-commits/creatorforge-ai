import { OpsCredits } from "@/components/admin/operations/OpsCredits";

export const metadata = { title: "Credit Balances" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Credit Balances</h1>
        <p className="mt-1 text-sm text-muted-foreground">Balances, burn rates and top-up tracking for credit-based providers.</p>
      </div>
      <OpsCredits />
    </div>
  );
}
