"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Play, Pause, CalendarPlus, Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function CampaignsList() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ kind: "info" | "success" | "error"; text: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  function load() { fetch("/api/autopilot/campaigns").then((r) => r.json()).then((d) => setCampaigns(d.campaigns ?? [])); }
  useEffect(() => { load(); }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch("/api/autopilot/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    load();
  }
  async function plan(id: string) {
    setMsg(null);
    const r = await fetch("/api/autopilot/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: id, days: 14 }) });
    const d = await r.json();
    if (!r.ok) { setMsg({ kind: "error", text: d.error || "Could not generate plan." }); return; }
    setMsg({ kind: d.sufficient ? "info" : "error", text: `Planned ${d.jobs.length} item(s) · est. ${d.estimatedCredits} credits${d.sufficient ? "" : " — insufficient balance"}. See the Planner / Queue.` });
  }
  async function remove(id: string) {
    setRemoving(true); setMsg(null);
    try {
      const res = await fetch(`/api/autopilot/campaigns?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMsg({ kind: "error", text: d.error || "Couldn't delete the campaign. Please try again." });
        return;
      }
      setMsg({ kind: "success", text: "Campaign deleted." });
      load();
    } catch {
      setMsg({ kind: "error", text: "Network error while deleting. Please try again." });
    } finally {
      setRemoving(false);
      setConfirmDelete(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CardTitle>Campaigns</CardTitle>
        <Button asChild variant="accent"><Link href="/dashboard/autopilot/campaigns/new"><Plus className="h-4 w-4" /> New campaign</Link></Button>
      </div>
      {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}

      {campaigns.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">No campaigns yet. Create one to let Autopilot plan your content.</Card>
      ) : campaigns.map((c) => (
        <Card key={c.id} className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{c.name}</h3>
              <p className="text-xs text-muted-foreground">{c.industry || "—"} · {(c.content_types ?? []).length} content type(s) · {(c.destinations ?? []).length} destination(s)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${c.mode === "full" ? "bg-brand-100 text-brand-800" : c.mode === "assisted" ? "bg-sky-100 text-sky-800" : "bg-muted text-muted-foreground"}`}>{c.mode}</span>
              <Badge variant={c.status === "active" ? "success" : "warning"}>{c.status}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => plan(c.id)}><CalendarPlus className="h-4 w-4" /> Generate plan</Button>
            {c.status === "active"
              ? <Button size="sm" variant="ghost" onClick={() => patch(c.id, { status: "paused" })}><Pause className="h-4 w-4" /> Pause</Button>
              : <Button size="sm" variant="ghost" onClick={() => patch(c.id, { status: "active" })}><Play className="h-4 w-4" /> Resume</Button>}
            <select value={c.mode} onChange={(e) => patch(c.id, { mode: e.target.value })} className="h-8 rounded-lg border border-border bg-background px-2 text-sm">
              <option value="manual">Manual</option><option value="assisted">Assisted</option><option value="full">Full Autopilot</option>
            </select>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(c)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </Card>
      ))}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete campaign?"
        description={confirmDelete ? `Delete "${confirmDelete.name}"? Its planned content and settings will be removed. This can't be undone.` : undefined}
        confirmLabel="Delete"
        loading={removing}
        onConfirm={() => { if (confirmDelete) remove(confirmDelete.id); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
