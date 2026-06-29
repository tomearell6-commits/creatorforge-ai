import { InfraOverview } from "@/components/admin/InfraOverview";
export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Infrastructure Operations Center</h1>
        <p className="mt-1 text-muted-foreground">Every external service, provider, quota, balance, renewal and health metric in one place.</p>
      </div>
      <InfraOverview />
    </div>
  );
}
