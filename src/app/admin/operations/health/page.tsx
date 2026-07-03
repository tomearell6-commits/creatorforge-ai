import { OpsHealth } from "@/components/admin/operations/OpsMisc";

export const metadata = { title: "Service Health" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every provider record: plan, cost, renewal, notes and dashboards.</p>
      </div>
      <OpsHealth />
    </div>
  );
}
