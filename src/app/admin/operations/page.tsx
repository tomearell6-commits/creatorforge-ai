import { OpsOverview } from "@/components/admin/operations/OpsOverview";

export const metadata = { title: "Operations Overview" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operations Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform status, alerts, renewals, spend — everything at a glance.</p>
      </div>
      <OpsOverview />
    </div>
  );
}
