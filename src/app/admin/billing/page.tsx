import { AdminBillingCenter } from "@/components/admin/AdminBillingCenter";

export const metadata = { title: "Billing & Plans — Admin — CreatorsForge AI" };

export default function AdminBillingPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Billing &amp; Plans</h1>
      <p className="mt-1 text-muted-foreground">
        Plan catalog, coupons, revenue and payment activity.
      </p>
      <div className="mt-6">
        <AdminBillingCenter />
      </div>
    </div>
  );
}
