"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AffiliateAccount, AffiliateCommission } from "@/lib/types";

const AFFILIATE_STATUS_VARIANT = {
  active: "success",
  pending: "warning",
  suspended: "danger",
} as const;

type Data = {
  account: AffiliateAccount | null;
  link?: string;
  report?: { clicks: number; conversions: number; totalEarnings: number; paid: number; balance: number };
  commissions?: AffiliateCommission[];
};

export function AffiliateCenter() {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() { setD(await (await fetch("/api/affiliate")).json()); }
  useEffect(() => { load(); }, []);

  async function register() {
    setBusy(true);
    await fetch("/api/affiliate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "register" }) });
    await load();
    setBusy(false);
  }
  async function payout() {
    await fetch("/api/affiliate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "payout", payoutMethod: "paypal" }) });
    alert("Payout request recorded — our team will process it.");
  }

  if (!d) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!d.account) {
    return (
      <Card className="space-y-3 text-center">
        <h3 className="font-semibold">Become an affiliate</h3>
        <p className="text-sm text-muted-foreground">Earn 30% recurring commission on every customer you refer.</p>
        <div><Button disabled={busy} onClick={register}>{busy ? "Joining…" : "Join the affiliate program"}</Button></div>
      </Card>
    );
  }

  const r = d.report!;
  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Affiliate link</h3>
          <Badge variant={AFFILIATE_STATUS_VARIANT[d.account.status as keyof typeof AFFILIATE_STATUS_VARIANT] ?? "default"}>{d.account.status} · {Math.round(d.account.commission_rate * 100)}%</Badge>
        </div>
        <div className="flex gap-2">
          <code className="flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 text-sm">{d.link}</code>
          <Button onClick={() => { navigator.clipboard.writeText(d.link!); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied!" : "Copy"}</Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4"><div className="text-2xl font-bold">{r.clicks}</div><div className="text-xs text-muted-foreground">Clicks</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">{r.conversions}</div><div className="text-xs text-muted-foreground">Conversions</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">${r.totalEarnings.toFixed(2)}</div><div className="text-xs text-muted-foreground">Total earnings</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">${r.balance.toFixed(2)}</div><div className="text-xs text-muted-foreground">Balance</div></Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Payouts</h3>
          <Button size="sm" variant="outline" onClick={payout}>Request payout</Button>
        </div>
        <p className="text-xs text-muted-foreground">Payout processing is handled by our team (architecture in place; manual approval for now).</p>
      </Card>

      <Card>
        <h3 className="font-semibold">Marketing resources</h3>
        <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
          <li>Brand logos & banners (request via Support)</li>
          <li>Email swipe copy & social templates</li>
          <li>Product screenshots and demo videos</li>
        </ul>
      </Card>
    </div>
  );
}
