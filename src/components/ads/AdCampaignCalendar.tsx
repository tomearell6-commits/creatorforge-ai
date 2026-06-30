"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

const COLUMNS = ["draft", "scheduled", "publishing", "running", "paused", "completed", "failed"];
const LABEL: Record<string, string> = { draft: "Draft", scheduled: "Scheduled", publishing: "Publishing", running: "Running", paused: "Paused", completed: "Completed", failed: "Failed" };

export function AdCampaignCalendar() {
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; status: string; scheduled_at: string | null }[]>([]);
  useEffect(() => { fetch("/api/ads/campaigns").then((r) => r.json()).then((d) => setCampaigns(d.campaigns ?? [])); }, []);

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const list = campaigns.filter((c) => c.status === col);
        return (
          <div key={col} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{LABEL[col]} ({list.length})</p>
            {list.map((c) => (
              <Card key={c.id} className="p-3">
                <p className="text-sm font-medium">{c.name}</p>
                {c.scheduled_at && <p className="text-xs text-muted-foreground">{new Date(c.scheduled_at).toLocaleString()}</p>}
              </Card>
            ))}
          </div>
        );
      })}
      <p className="md:col-span-2 lg:col-span-4 text-xs text-muted-foreground">Move a campaign between stages from its dashboard actions. Date-based scheduling activates once a supported ad account is connected.</p>
    </div>
  );
}
