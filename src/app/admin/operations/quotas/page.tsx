import { OpsQuotas } from "@/components/admin/operations/OpsQuotas";

export const metadata = { title: "Usage Quotas" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usage Quotas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monthly limits and usage pressure per provider.</p>
      </div>
      <OpsQuotas />
    </div>
  );
}
