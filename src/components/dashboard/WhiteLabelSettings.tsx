"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { WhiteLabelConfig } from "@/lib/types";

export function WhiteLabelSettings() {
  const [c, setC] = useState<WhiteLabelConfig | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch("/api/white-label").then((r) => r.json()).then((j) => setC(j.config)); }, []);
  if (!c) return <p className="text-sm text-muted-foreground">Loading…</p>;

  async function save() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/white-label", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c),
    });
    setMsg(res.ok ? "Saved." : "Failed to save.");
    setBusy(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4">
        <h3 className="font-semibold">Branding</h3>
        <div>
          <label htmlFor="wl-brand-name" className="text-sm font-medium">Brand name</label>
          <Input id="wl-brand-name" value={c.brandName} onChange={(e) => setC({ ...c, brandName: e.target.value })} />
        </div>
        <div>
          <label htmlFor="wl-brand-color" className="text-sm font-medium">Brand color</label>
          <div className="flex items-center gap-2">
            <input id="wl-brand-color-picker" aria-label="Brand color picker" type="color" value={c.brandColor} onChange={(e) => setC({ ...c, brandColor: e.target.value })} className="h-10 w-14 rounded border border-border" />
            <Input id="wl-brand-color" value={c.brandColor} onChange={(e) => setC({ ...c, brandColor: e.target.value })} />
          </div>
        </div>
        <div>
          <label htmlFor="wl-logo-url" className="text-sm font-medium">Logo URL</label>
          <Input id="wl-logo-url" value={c.logoUrl ?? ""} onChange={(e) => setC({ ...c, logoUrl: e.target.value || null })} placeholder="https://…/logo.png" />
        </div>
        <div>
          <label htmlFor="wl-custom-domain" className="text-sm font-medium">Custom domain</label>
          <Input id="wl-custom-domain" value={c.customDomain ?? ""} onChange={(e) => setC({ ...c, customDomain: e.target.value || null })} placeholder="app.youragency.com" />
        </div>
        <div>
          <label htmlFor="wl-email-sender" className="text-sm font-medium">Email sender</label>
          <Input id="wl-email-sender" value={c.emailFrom ?? ""} onChange={(e) => setC({ ...c, emailFrom: e.target.value || null })} placeholder="noreply@youragency.com" />
        </div>
        <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save branding"}</Button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </Card>

      <Card className="space-y-3">
        <h3 className="font-semibold">Live preview</h3>
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: c.brandColor }}>
              {c.logoUrl ? <img src={c.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" /> : "▲"}
            </span>
            <span style={{ color: c.brandColor }}>{c.brandName}</span>
          </div>
          <button className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: c.brandColor }}>
            Sample button
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Branding applies to your workspace surfaces. Custom domain + email require DNS/SMTP setup
          (architecture in place; activated per agency plan).
        </p>
      </Card>
    </div>
  );
}
