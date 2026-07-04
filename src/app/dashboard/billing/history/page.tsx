import { redirect } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Billing History — CreatorsForge AI" };

const EVENT_LABEL: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" | "brand" }> = {
  upgrade: { label: "Upgrade", variant: "success" },
  downgrade: { label: "Downgrade", variant: "info" },
  renewal: { label: "Renewal", variant: "success" },
  topup: { label: "Top-Up", variant: "brand" },
  refund: { label: "Refund", variant: "info" },
  failed_payment: { label: "Failed Payment", variant: "danger" },
  cancelled_payment: { label: "Cancelled", variant: "default" },
  coupon_applied: { label: "Coupon", variant: "info" },
};

export default async function BillingHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: events } = await supabase
    .from("billing_history")
    .select("id, event_type, description, amount_usd, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!events?.length) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No billing events yet"
        description="Plan changes, renewals, top-ups, refunds and payment issues are recorded here."
      />
    );
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Event</th>
            <th className="px-4 py-3 font-semibold">Description</th>
            <th className="px-4 py-3 font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const meta = EVENT_LABEL[e.event_type] ?? { label: e.event_type, variant: "default" as const };
            return (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                <td className="px-4 py-3"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                <td className="px-4 py-3">{e.description}</td>
                <td className="px-4 py-3 whitespace-nowrap">{e.amount_usd != null ? `$${Number(e.amount_usd).toFixed(2)}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
