"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PLATFORMS } from "@/lib/constants";
import type { SocialAccount, SocialPlatform } from "@/lib/types";

function statusBadge(a: SocialAccount) {
  const expired = a.expires_at && new Date(a.expires_at) < new Date();
  const label = expired ? "Expired" : a.status;
  const cls = expired || a.status !== "connected" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function SocialAccounts() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/social");
    const json = await res.json();
    setAccounts(json.accounts ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function connect(platform: SocialPlatform) {
    setBusy(platform);
    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    const json = await res.json();
    if (json.mode === "oauth" && json.authorizeUrl) window.location.href = json.authorizeUrl;
    else await load();
    setBusy(null);
  }

  async function disconnect(id: string) {
    setBusy(id);
    await fetch(`/api/social/${id}`, { method: "DELETE" });
    await load();
    setBusy(null);
  }

  async function refresh(id: string) {
    setBusy(id);
    await fetch(`/api/social/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh" }),
    });
    await load();
    setBusy(null);
  }

  const connectedBy = new Map(accounts.map((a) => [a.platform, a]));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((p) => {
          const acc = connectedBy.get(p.id);
          return (
            <Card key={p.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-xl">{p.emoji}</span> {p.name}
                </div>
                {acc ? statusBadge(acc) : <span className="text-xs text-muted-foreground">Not connected</span>}
              </div>
              {acc ? (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>{acc.account_handle ?? acc.account_name}</div>
                  <div>Connected {new Date(acc.connected_at).toLocaleDateString()}</div>
                  <div>Last sync {acc.last_synced_at ? new Date(acc.last_synced_at).toLocaleString() : "—"}</div>
                  <div>Expires {acc.expires_at ? new Date(acc.expires_at).toLocaleDateString() : "—"}</div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Connect to publish and schedule to {p.name}.</p>
              )}
              <div className="mt-auto flex gap-2">
                {acc ? (
                  <>
                    <Button size="sm" variant="outline" disabled={busy === acc.id} onClick={() => refresh(acc.id)}>
                      Refresh
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy === acc.id} onClick={() => disconnect(acc.id)}>
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button size="sm" disabled={busy === p.id} onClick={() => connect(p.id)}>
                    {busy === p.id ? "Connecting…" : "Connect"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading accounts…</p>}
    </div>
  );
}
