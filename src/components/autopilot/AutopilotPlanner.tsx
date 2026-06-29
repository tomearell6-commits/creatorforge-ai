"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

const DOT: Record<string, string> = {
  planned: "bg-muted-foreground", scheduled: "bg-violet-500", awaiting_approval: "bg-amber-500",
  publishing: "bg-sky-500", published: "bg-brand-500", failed: "bg-red-500", generating: "bg-sky-500", queued: "bg-muted-foreground",
};

/** Groups upcoming jobs by day — a lightweight visual planner. */
export function AutopilotPlanner() {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => { fetch("/api/autopilot/queue").then((r) => r.json()).then((d) => setJobs(d.jobs ?? [])); }, []);

  const byDay = new Map<string, any[]>();
  for (const j of jobs) {
    const day = j.scheduled_time ? new Date(j.scheduled_time).toLocaleDateString() : "Unscheduled";
    byDay.set(day, [...(byDay.get(day) ?? []), j]);
  }
  const days = [...byDay.entries()];

  if (jobs.length === 0) return <Card className="text-center text-sm text-muted-foreground">No planned content yet. Generate a plan from a campaign to populate the planner.</Card>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {["planned", "scheduled", "awaiting_approval", "publishing", "published", "failed"].map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${DOT[s]}`} /> {s.replace(/_/g, " ")}</span>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {days.map(([day, items]) => (
          <Card key={day} className="space-y-2">
            <h3 className="text-sm font-semibold">{day}</h3>
            {items.map((j) => (
              <div key={j.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5 text-sm">
                <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[j.status] ?? "bg-muted-foreground"}`} />
                <span className="flex-1 truncate">{j.title}</span>
                <span className="text-xs capitalize text-muted-foreground">{(j.destination ?? "").replace(/_/g, " ")}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
