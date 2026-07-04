import { BillingNav } from "@/components/billing/BillingNav";

export const metadata = { title: "Subscription & Billing — CreatorsForge AI" };

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription &amp; Billing</h1>
        <p className="mt-1 text-muted-foreground">
          Your plan, credits, invoices and payments — all in one place.
        </p>
      </div>
      <BillingNav />
      {children}
    </div>
  );
}
