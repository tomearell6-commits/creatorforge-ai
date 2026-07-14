"use client";

import { useState } from "react";
import { MapPin, Check, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { BrandIcon } from "@/components/icons/BrandIcon";

type Account = { id: string; google_email: string | null; status: string; expires_at: string | null; last_synced_at: string | null; connected_at: string };

export function GoogleConnectionCard({ accounts, liveApi, onChange }: { accounts: Account[]; liveApi: boolean; onChange?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function connect() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/local-business/connect", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (j.available && j.authorizeUrl) { window.location.href = j.authorizeUrl; return; }
      setMsg(j.message || "Google Business Profile connection isn't available yet.");
    } finally { setBusy(false); }
  }
  async function disconnect(id: string) {
    setBusy(true);
    try { await fetch("/api/local-business/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: id }) }); onChange?.(); }
    finally { setBusy(false); }
  }
  async function sync(id: string) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/local-business/locations/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: id }) });
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || j.message || "Sync complete.");
      onChange?.();
    } finally { setBusy(false); }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <BrandIcon platform="google" className="h-5 w-5" />
        <h2 className="text-base font-semibold">Google Business Profile</h2>
        {accounts.length > 0 ? <Badge variant="success"><Check className="h-3 w-3" /> Connected</Badge> : <Badge variant="default">Not connected</Badge>}
      </div>

      {accounts.length === 0 ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">Connect your Google account to manage your business locations, run audits, and prepare posts. We use official Google sign-in — never your password.</p>
          {!liveApi && (
            <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Live Google Business Profile access needs a one-time Google Cloud setup with approved Business Profile API access. Until then you can still add locations manually, run audits, and prepare posts — publishing to Google activates once access is approved.</p>
            </div>
          )}
          {msg && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{msg}</p>}
          <Button className="mt-3" onClick={connect} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <MapPin className="h-4 w-4" />} Connect Google account</Button>
        </>
      ) : (
        <div className="mt-3 space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.google_email || "Google account"}</p>
                <p className="text-xs text-muted-foreground">
                  {a.status === "connected" ? "Connected" : a.status}
                  {a.last_synced_at ? ` · synced ${new Date(a.last_synced_at).toLocaleDateString()}` : ""}
                  {a.expires_at && new Date(a.expires_at) < new Date() ? " · token expired — reconnect" : ""}
                </p>
              </div>
              {a.status !== "connected" && <Badge variant="warning"><AlertTriangle className="h-3 w-3" /> {a.status}</Badge>}
              {liveApi && <Button variant="outline" size="sm" onClick={() => sync(a.id)} disabled={busy}>{busy ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync from Google</Button>}
              <Button variant="ghost" size="sm" onClick={() => disconnect(a.id)} disabled={busy}>Disconnect</Button>
            </div>
          ))}
          {!liveApi && (
            <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Connected. Live location sync + publishing to Google activate once approved Business Profile API access is enabled. Until then, add locations manually and prepare posts.</p>
            </div>
          )}
          {msg && <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{msg}</p>}
        </div>
      )}
    </Card>
  );
}
