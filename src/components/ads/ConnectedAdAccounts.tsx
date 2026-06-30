"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type Row = { id: string; name: string; docsUrl: string; supportsPublish: boolean; supportsReporting: boolean; configured: boolean; account: { id: string; account_name: string; connection_status: string; permission_status: string; last_sync_at: string } | null };

export function ConnectedAdAccounts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  function load() { fetch("/api/ads/accounts").then((r) => r.json()).then((d) => setRows(d.platforms ?? [])); }
  useEffect(() => { load(); }, []);

  async function connect(platform: string) {
    setMsg(null);
    const r = await fetch("/api/ads/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform }) });
    const d = await r.json();
    setMsg(d.note || d.error);
  }
  async function disconnect(id: string) { await fetch(`/api/ads/accounts?id=${id}`, { method: "DELETE" }); load(); }

  return (
    <div className="space-y-4">
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <Card key={p.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{p.name}</span>
              <Badge variant={p.account ? "success" : "default"}>{p.account ? p.account.connection_status : "Not connected"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {p.account ? <>{p.account.account_name} · synced {p.account.last_sync_at ? new Date(p.account.last_sync_at).toLocaleDateString() : "—"}</> : (p.configured ? "Ready to connect via official OAuth." : "Requires the platform's Ads API app (not enabled yet).")}
            </p>
            <div className="flex gap-2">
              {p.account
                ? <Button size="sm" variant="ghost" className="text-red-600" onClick={() => disconnect(p.account!.id)}>Disconnect</Button>
                : <Button size="sm" variant="outline" disabled={!p.configured} onClick={() => connect(p.id)}>{p.configured ? "Connect" : "Not enabled"}</Button>}
              <a href={p.docsUrl} target="_blank" rel="noopener noreferrer" className="self-center text-xs text-muted-foreground hover:underline">API docs</a>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Ad-account connections use each platform&apos;s official OAuth and activate once that platform&apos;s Ads API app is approved and its credentials are configured.</p>
    </div>
  );
}
