"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PLANS } from "@/lib/constants";

export function AdminSubscriptions() {
  const [planMix, setPlanMix] = useState<Record<string, number>>({});
  const [mrr, setMrr] = useState(0);
  const [arr, setArr] = useState(0);
  useEffect(() => {
    fetch("/api/admin/overview").then((r) => r.json()).then((d) => { setPlanMix(d.planMix ?? {}); setMrr(d.mrr ?? 0); setArr(d.arr ?? 0); });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card className="p-4"><div className="text-2xl font-bold">${mrr}</div><div className="text-xs text-muted-foreground">MRR</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">${arr}</div><div className="text-xs text-muted-foreground">ARR</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">{Object.values(planMix).reduce((a, b) => a + b, 0)}</div><div className="text-xs text-muted-foreground">Total accounts</div></Card>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Plan</th><th className="p-3">Price</th><th className="p-3">Credits</th><th className="p-3">Subscribers</th></tr>
          </thead>
          <tbody>
            {PLANS.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">${p.price}/mo</td>
                <td className="p-3">{p.credits.toLocaleString()}</td>
                <td className="p-3">{planMix[p.id] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <h3 className="font-semibold">Coupons, discounts & credit packages</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Stored under the <code>billing</code> system setting. Refunds & invoices are tracked in
          <code className="mx-1">billing_events</code>. A full visual editor (create coupons, issue refunds,
          manage credit packages) is scoped for Phase 8.
        </p>
      </Card>
    </div>
  );
}
