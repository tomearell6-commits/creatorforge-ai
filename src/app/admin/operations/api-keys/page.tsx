import { OpsApiKeys } from "@/components/admin/operations/OpsApiKeys";

export const metadata = { title: "API Key Rotation" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Key Rotation</h1>
        <p className="mt-1 text-sm text-muted-foreground">Rotation schedules and masked key status for every provider.</p>
      </div>
      <OpsApiKeys />
    </div>
  );
}
