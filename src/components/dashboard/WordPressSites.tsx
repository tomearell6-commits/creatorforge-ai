"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Site = { id: string; site_name: string; site_url: string; username: string; default_category: string | null; connection_status: string; last_connection_test: string | null };

export function WordPressSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [form, setForm] = useState({ siteName: "", siteUrl: "", username: "", appPassword: "", defaultCategory: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Site | null>(null);

  async function load() { const j = await (await fetch("/api/wordpress/sites")).json(); setSites(j.sites ?? []); }
  useEffect(() => { load(); }, []);

  async function connect() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/wordpress/sites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await res.json();
    if (!res.ok) setMsg({ kind: "error", text: j.error || "Connection failed." });
    else { setForm({ siteName: "", siteUrl: "", username: "", appPassword: "", defaultCategory: "" }); setMsg({ kind: "success", text: "Connected." }); await load(); }
    setBusy(false);
  }
  async function remove(id: string) {
    setRemoving(true); setMsg(null);
    try {
      const res = await fetch(`/api/wordpress/sites/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg({ kind: "error", text: j.error || "Couldn't disconnect the site. Please try again." });
        return;
      }
      setMsg({ kind: "success", text: "Site disconnected." });
      await load();
    } catch {
      setMsg({ kind: "error", text: "Network error while disconnecting. Please try again." });
    } finally {
      setRemoving(false);
      setConfirmRemove(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-3">
        <h3 className="font-semibold">Connect a WordPress site</h3>
        <p className="text-xs text-muted-foreground">
          In WordPress: <strong>Users → Profile → Application Passwords</strong> → create one named “CreatorsForge”, then paste it below.
          We verify via the REST API and store the password <strong>encrypted</strong> (never raw).
        </p>
        <div><Label htmlFor="wp-site-name">Site name</Label><Input id="wp-site-name" value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} placeholder="My Blog" /></div>
        <div><Label htmlFor="wp-site-url">Site URL</Label><Input id="wp-site-url" value={form.siteUrl} onChange={(e) => setForm({ ...form, siteUrl: e.target.value })} placeholder="https://yourblog.com" /></div>
        <div><Label htmlFor="wp-username">Username</Label><Input id="wp-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
        <div><Label htmlFor="wp-app-password">Application password</Label><Input id="wp-app-password" value={form.appPassword} onChange={(e) => setForm({ ...form, appPassword: e.target.value })} placeholder="xxxx xxxx xxxx xxxx" /></div>
        <div><Label htmlFor="wp-default-category">Default category (optional)</Label><Input id="wp-default-category" value={form.defaultCategory} onChange={(e) => setForm({ ...form, defaultCategory: e.target.value })} /></div>
        <Button disabled={busy} onClick={connect}>{busy ? "Verifying…" : "Connect & test"}</Button>
        {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold">Your sites</h3>
        {sites.length === 0 && <p className="text-sm text-muted-foreground">No sites connected yet.</p>}
        {sites.map((s) => (
          <Card key={s.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium">{s.site_name}</div>
              <div className="text-xs text-muted-foreground">{s.site_url} · {s.username}</div>
              <div className="mt-1 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${s.connection_status === "connected" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{s.connection_status}</span>
              </div>
            </div>
            <button className="text-xs text-red-600 underline" onClick={() => setConfirmRemove(s)}>Disconnect</button>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Disconnect site?"
        description={confirmRemove ? `Disconnect ${confirmRemove.site_name}? Publishing to this site will stop until you reconnect it.` : undefined}
        confirmLabel="Disconnect"
        loading={removing}
        onConfirm={() => { if (confirmRemove) remove(confirmRemove.id); }}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
