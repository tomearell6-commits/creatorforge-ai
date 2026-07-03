import { OpsSubscriptions } from "@/components/admin/operations/OpsSubscriptions";

export const metadata = { title: "Provider Subscriptions" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Provider Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Renewal dates, billing cycles and costs.</p>
      </div>
      <OpsSubscriptions />
    </div>
  );
}
