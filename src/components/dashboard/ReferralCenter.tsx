"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Referral } from "@/lib/types";

type Data = { code: string; link: string; stats: { total: number; converted: number; pendingPayout: number }; referrals: Referral[] };

export function ReferralCenter() {
  const [d, setD] = useState<Data | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetch("/api/referrals").then((r) => r.json()).then(setD); }, []);
  if (!d) return <p className="text-sm text-muted-foreground">Loading…</p>;

  function copy() {
    navigator.clipboard.writeText(d!.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <h3 className="font-semibold">Your referral link</h3>
        <div className="flex gap-2">
          <code className="flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 text-sm">{d.link}</code>
          <Button onClick={copy}>{copied ? "Copied!" : "Copy"}</Button>
        </div>
        <p className="text-xs text-muted-foreground">Share your link. When someone signs up and subscribes, you earn reward credits.</p>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-2xl font-bold">{d.stats.total}</div><div className="text-xs text-muted-foreground">Total referrals</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">{d.stats.converted}</div><div className="text-xs text-muted-foreground">Converted</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">{d.stats.pendingPayout}</div><div className="text-xs text-muted-foreground">Reward credits</div></Card>
      </div>

      <Card>
        <h3 className="font-semibold">Referral history</h3>
        <div className="mt-3 space-y-1 text-sm">
          {d.referrals.length === 0 && <p className="text-muted-foreground">No referrals yet.</p>}
          {d.referrals.map((r) => (
            <div key={r.id} className="flex justify-between border-b border-border/50 py-1 last:border-0">
              <span>{r.status === "converted" ? "✅ Converted" : "⏳ Pending"}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
