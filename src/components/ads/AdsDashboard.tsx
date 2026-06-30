"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const STATUS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground", scheduled: "bg-violet-100 text-violet-800",
  publishing: "bg-sky-100 text-sky-800", running: "bg-brand-100 text-brand-800",
  paused: "bg-amber-100 text-amber-800", completed: "bg-brand-100 text-brand-800", failed: "bg-red-100 text-red-700",
};

export function AdsDashboard() {
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; objective: string; status: string; platforms: string[]; created_at: string }[]>([]);
  function load() { fetch("/api/ads/campaigns").then((r) => r.json()).then((d) => setCampaigns(d.campaigns ?? [])); }
  useEffect(() => { load(); }, []);

  async function patch(id: string, status: string) {
    await fetch("/api/ads/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CardTitle>Campaigns</CardTitle>
        <Button asChild variant="accent"><Link href="/dashboard/ads/create"><Plus className="h-4 w-4" /> Create campaign</Link></Button>
      </div>
      {campaigns.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <Megaphone className="h-8 w-8" />
          <p>No campaigns yet. Create your first advertising campaign.</p>
          <Button asChild><Link href="/dashboard/ads/create">Create campaign</Link></Button>
        </Card>
      ) : campaigns.map((c) => (
        <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{c.name}</p>
            <p className="text-xs capitalize text-muted-foreground">{c.objective} · {(c.platforms ?? []).join(", ") || "no platform"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS[c.status] ?? "bg-muted"}`}>{c.status}</span>
            {c.status === "draft" && <Button size="sm" variant="outline" onClick={() => patch(c.id, "scheduled")}>Schedule</Button>}
            {c.status === "running" && <Button size="sm" variant="ghost" onClick={() => patch(c.id, "paused")}>Pause</Button>}
            {c.status === "paused" && <Button size="sm" variant="ghost" onClick={() => patch(c.id, "running")}>Resume</Button>}
          </div>
        </Card>
      ))}
    </div>
  );
}
