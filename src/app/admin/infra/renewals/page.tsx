import { InfraRenewals } from "@/components/admin/InfraRenewals";
export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Renewal Center</h1>
        <p className="mt-1 text-muted-foreground">All services sorted by renewal date, with urgency highlighting.</p>
      </div>
      <InfraRenewals />
    </div>
  );
}
