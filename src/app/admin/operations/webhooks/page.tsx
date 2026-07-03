import { OpsWebhooks } from "@/components/admin/operations/OpsMisc";

export const metadata = { title: "Webhook Health" };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Webhook Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">Delivery status for payment, email and publishing webhooks.</p>
      </div>
      <OpsWebhooks />
    </div>
  );
}
