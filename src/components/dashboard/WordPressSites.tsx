"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

type Site = { id: string; site_name: string; site_url: string; username: string; default_category: string | null; connection_status: string; last_connection_test: string | null };

export function WordPressSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [form, setForm] = useState({ siteName: "", siteUrl: "", username: "", appPassword: "", defaultCategory: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() { const j = await (await fetch("/api/wordpress/sites")).json(); setSites(j.sites ?? []); }
  useEffect(() => { load(); }, []);

  async function connect() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/wordpress/sites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await res.json();
    if (!res.ok) setMsg(j.error || "Connection failed.");
    else { setForm({ siteName: "", siteUrl: "", username: "", appPassword: "", defaultCategory: "" }); setMsg("Connected ✅"); await load(); }
    setBusy(false);
  }
  async function remove(id: string) { await fetch(`/api/wordpress/sites/${id}`, { method: "DELETE" }); await load(); }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-3">
        <h3 className="font-semibold">Connect a WordPress site</h3>
        <p className="text-xs text-muted-foreground">
          In WordPress: <strong>Users → Profile → Application Passwords</strong> → create one named “CreatorForge”, then paste it below.
          We verify via the REST API and store the password <strong>encrypted</strong> (never raw).
        </p>
        <div><Label htmlFor="wp-site-name">Site name</Label><Input id="wp-site-name" value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} placeholder="My Blog" /></div>
        <div><Label htmlFor="wp-site-url">Site URL</Label><Input id="wp-site-url" value={form.siteUrl} onChange={(e) => setForm({ ...form, siteUrl: e.target.value })} placeholder="https://yourblog.com" /></div>
        <div><Label htmlFor="wp-username">Username</Label><Input id="wp-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
        <div><Label htmlFor="wp-app-password">Application password</Label><Input id="wp-app-password" value={form.appPassword} onChange={(e) => setForm({ ...form, appPassword: e.target.value })} placeholder="xxxx xxxx xxxx xxxx" /></div>
        <div><Label htmlFor="wp-default-category">Default category (optional)</Label><Input id="wp-default-category" value={form.defaultCategory} onChange={(e) => setForm({ ...form, defaultCategory: e.target.value })} /></div>
        <Button disabled={busy} onClick={connect}>{busy ? "Verifying…" : "Connect & test"}</Button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
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
            <button className="text-xs text-red-600 underline" onClick={() => remove(s.id)}>Disconnect</button>
          </Card>
        ))}
      </div>
    </div>
  );
}
