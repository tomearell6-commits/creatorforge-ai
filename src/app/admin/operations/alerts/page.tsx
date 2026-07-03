import { OpsAlerts } from "@/components/admin/operations/OpsMisc";

export const metadata = { title: "Operations Alerts" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operations Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Unified alerts with recommended actions.</p>
      </div>
      <OpsAlerts />
    </div>
  );
}
