"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PLATFORMS } from "@/lib/constants";
import { PlatformIcon } from "@/components/icons/PlatformIcon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { SocialAccount, SocialPlatform } from "@/lib/types";

function statusBadge(a: SocialAccount) {
  const expired = a.expires_at && new Date(a.expires_at) < new Date();
  const label = expired ? "Expired" : a.status;
  const cls = expired || a.status !== "connected" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_callback: "The connection link was invalid or expired. Please try again.",
  not_configured: "That platform isn't configured yet (missing API credentials).",
  access_denied: "You declined the authorization request.",
};

function prettyPlatform(id?: string) {
  return PLATFORMS.find((p) => p.id === id)?.name ?? id ?? "the platform";
}

export function SocialAccounts({ connected, error }: { connected?: string; error?: string } = {}) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [wpOpen, setWpOpen] = useState(false);
  const [wp, setWp] = useState({ siteUrl: "", username: "", appPassword: "" });
  const [wpError, setWpError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<SocialAccount | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "error"; text: string } | null>(
    connected
      ? { kind: "ok", text: `${prettyPlatform(connected)} connected successfully.` }
      : error
        ? { kind: "error", text: ERROR_MESSAGES[error] ?? `Couldn't connect ${prettyPlatform(error.replace(/_connect_failed$/, ""))}. Please try again.` }
        : null
  );

  // Clean the ?connected=/?error= params from the URL after showing the banner.
  useEffect(() => {
    if ((connected || error) && typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [connected, error]);

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
    try {
      const res = await fetch(`/api/social/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setBanner({ kind: "error", text: j.error ?? "Couldn't disconnect the account. Please try again." });
        return;
      }
      setBanner({ kind: "ok", text: "Account disconnected." });
      await load();
    } catch {
      setBanner({ kind: "error", text: "Network error while disconnecting. Please try again." });
    } finally {
      setBusy(null);
      setConfirmDisconnect(null);
    }
  }

  async function connectWordPress() {
    setBusy("wordpress"); setWpError(null);
    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "wordpress", ...wp }),
    });
    const json = await res.json();
    if (!res.ok) { setWpError(json.error ?? "Failed to connect"); setBusy(null); return; }
    setWp({ siteUrl: "", username: "", appPassword: "" });
    setWpOpen(false);
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
      {banner && (
        <div
          className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
            banner.kind === "ok"
              ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20"
              : "border-red-300 bg-red-50 text-red-700 dark:bg-red-900/20"
          }`}
        >
          <span>{banner.kind === "ok" ? "✅ " : "⚠️ "}{banner.text}</span>
          <button className="text-xs opacity-70 hover:opacity-100" onClick={() => setBanner(null)}>Dismiss</button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((p) => {
          const acc = connectedBy.get(p.id);
          return (
            <Card key={p.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <PlatformIcon platform={p.id} className="h-5 w-5" />
                  {p.name}
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
                    <Button size="sm" variant="ghost" disabled={busy === acc.id} onClick={() => setConfirmDisconnect(acc)}>
                      Disconnect
                    </Button>
                  </>
                ) : p.connectType === "credentials" ? (
                  <Button size="sm" onClick={() => setWpOpen((v) => !v)}>
                    {wpOpen ? "Cancel" : "Connect"}
                  </Button>
                ) : (
                  <Button size="sm" disabled={busy === p.id} onClick={() => connect(p.id)}>
                    {busy === p.id ? "Connecting…" : "Connect"}
                  </Button>
                )}
              </div>

              {!acc && p.connectType === "credentials" && wpOpen && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    In WordPress: <strong>Users → Profile → Application Passwords</strong> → add one named “CreatorForge”, then paste it below.
                  </p>
                  <Input value={wp.siteUrl} onChange={(e) => setWp({ ...wp, siteUrl: e.target.value })} placeholder="https://yourblog.com" />
                  <Input value={wp.username} onChange={(e) => setWp({ ...wp, username: e.target.value })} placeholder="WordPress username" />
                  <Input value={wp.appPassword} onChange={(e) => setWp({ ...wp, appPassword: e.target.value })} placeholder="Application password (xxxx xxxx xxxx)" />
                  <Button size="sm" disabled={busy === "wordpress"} onClick={connectWordPress}>
                    {busy === "wordpress" ? "Verifying…" : "Connect WordPress"}
                  </Button>
                  {wpError && <p className="text-xs text-red-600">{wpError}</p>}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading accounts…</p>}

      <ConfirmDialog
        open={confirmDisconnect !== null}
        title="Disconnect account?"
        description={confirmDisconnect ? `Disconnect ${prettyPlatform(confirmDisconnect.platform)}? You'll need to reconnect it before you can publish or schedule again.` : undefined}
        confirmLabel="Disconnect"
        loading={busy === confirmDisconnect?.id}
        onConfirm={() => { if (confirmDisconnect) disconnect(confirmDisconnect.id); }}
        onCancel={() => setConfirmDisconnect(null)}
      />
    </div>
  );
}
