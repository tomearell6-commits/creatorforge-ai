"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

type ApiPlan = {
  id: string; name: string; tagline: string; price: number; annualPrice: number | null;
  credits: number; custom: boolean; badge: string | null; features: string[];
};
type Row = { key: string; label: string; group: string; values: Record<string, boolean | string> };
type Payload = {
  currentPlan: string;
  plans: ApiPlan[];
  comparison: { groups: { id: string; label: string }[]; rows: Row[] };
};

function CellValue({ v }: { v: boolean | string | undefined }) {
  if (v === true) return <Check className="mx-auto h-4 w-4 text-brand-600" aria-label="Included" />;
  if (v === false || v === undefined) return <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" aria-label="Not included" />;
  return <span className="text-xs">{v}</span>;
}

/** Plan cards + full feature comparison table. */
export function PlansView() {
  const [data, setData] = useState<Payload | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<ApiPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setError("Could not load plans."));
  }, []);

  async function checkout(plan: ApiPlan) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Checkout failed.");
      window.location.href = d.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
      setBusy(false);
      setConfirmPlan(null);
    }
  }

  if (!data && !error) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data) return <p className="text-sm text-red-500">{error}</p>;

  const current = data.plans.find((p) => p.id === data.currentPlan);

  return (
    <div className="space-y-10">
      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {data.plans.map((plan) => {
          const isCurrent = plan.id === data.currentPlan;
          const isUpgrade = (current?.price ?? 0) < plan.price;
          return (
            <Card key={plan.id} className={cn("flex flex-col", plan.badge === "Most Popular" && "border-brand-600")}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">{plan.name}</h3>
                {plan.badge && <Badge variant="brand">{plan.badge}</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{plan.tagline}</p>
              <div className="mt-3 flex items-baseline gap-1">
                {plan.custom ? (
                  <span className="text-2xl font-extrabold">Custom</span>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold">${plan.price}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </>
                )}
              </div>
              {plan.annualPrice != null && (
                <p className="text-xs text-muted-foreground">or ${plan.annualPrice}/year (2 months free)</p>
              )}
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Button variant="secondary" className="mt-4 w-full" disabled>Current plan</Button>
              ) : plan.custom ? (
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link href="/dashboard/billing/support">Contact Sales</Link>
                </Button>
              ) : plan.price === 0 ? (
                <Button variant="outline" className="mt-4 w-full" disabled>Free</Button>
              ) : (
                <Button className="mt-4 w-full" disabled={busy} onClick={() => setConfirmPlan(plan)}>
                  {isUpgrade ? "Upgrade" : "Choose Plan"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Comparison table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Compare every feature</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-3 font-semibold">Feature</th>
                {data.plans.map((p) => (
                  <th key={p.id} className={cn("px-3 py-3 text-center font-semibold", p.id === data.currentPlan && "text-brand-600")}>
                    {p.name}
                    {p.id === data.currentPlan && <span className="block text-[10px] font-normal text-muted-foreground">current</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.comparison.groups.map((g) => (
                <GroupRows key={g.id} group={g} rows={data.comparison.rows.filter((r) => r.group === g.id)} planIds={data.plans.map((p) => p.id)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={confirmPlan !== null}
        title={`Switch to ${confirmPlan?.name}?`}
        description={
          confirmPlan
            ? `You'll be taken to a secure crypto checkout for $${confirmPlan.price}. Once the payment confirms, ${confirmPlan.credits.toLocaleString()} monthly credits are added and your plan changes immediately. This is a one-time purchase — it never auto-renews.`
            : undefined
        }
        confirmLabel={busy ? "Opening checkout…" : "Continue to checkout"}
        danger={false}
        loading={busy}
        onConfirm={() => confirmPlan && checkout(confirmPlan)}
        onCancel={() => setConfirmPlan(null)}
      />
    </div>
  );
}

function GroupRows({ group, rows, planIds }: { group: { id: string; label: string }; rows: Row[]; planIds: string[] }) {
  return (
    <>
      <tr className="border-b border-border bg-muted/20">
        <td colSpan={planIds.length + 1} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {group.label}
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={r.key} className="border-b border-border last:border-0">
          <td className="px-4 py-2.5">{r.label}</td>
          {planIds.map((pid) => (
            <td key={pid} className="px-3 py-2.5 text-center">
              <CellValue v={r.values[pid]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
