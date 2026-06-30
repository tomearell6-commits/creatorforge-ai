"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  planned: "default", queued: "warning",
  generating: "warning", awaiting_approval: "warning",
  scheduled: "warning", publishing: "warning",
  published: "success", failed: "danger",
};

export function QueueManager() {
  const [jobs, setJobs] = useState<any[]>([]);
  function load() { fetch("/api/autopilot/queue").then((r) => r.json()).then((d) => setJobs(d.jobs ?? [])); }
  useEffect(() => { load(); }, []);

  async function action(jobId: string, action: string, scheduledTime?: string) {
    await fetch("/api/autopilot/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, action, scheduledTime }) });
    load();
  }

  if (jobs.length === 0) return <Card className="text-center text-sm text-muted-foreground">No jobs in the queue yet. Generate a plan from a campaign.</Card>;

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs text-muted-foreground">
          <tr><th className="p-3">Content</th><th className="p-3">Platform</th><th className="p-3">Scheduled</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id} className="border-b border-border/50">
              <td className="p-3"><div className="font-medium">{j.title}</div><div className="text-xs capitalize text-muted-foreground">{j.content_type?.replace(/_/g, " ")} · {j.estimated_credits} cr</div></td>
              <td className="p-3 capitalize">{(j.destination ?? "—").replace(/_/g, " ")}</td>
              <td className="p-3 text-xs">{j.scheduled_time ? new Date(j.scheduled_time).toLocaleString() : "—"}{j.error_message && <div className="text-red-600">{j.error_message}</div>}</td>
              <td className="p-3"><Badge variant={STATUS_VARIANT[j.status] ?? "default"}>{j.status?.replace(/_/g, " ")}</Badge></td>
              <td className="p-3">
                <div className="flex flex-wrap gap-1">
                  {j.status === "awaiting_approval" && <Button size="sm" onClick={() => action(j.id, "approve")}>Approve</Button>}
                  {j.status === "failed" && <Button size="sm" variant="outline" onClick={() => action(j.id, "retry")}>Retry</Button>}
                  {["planned", "scheduled", "awaiting_approval"].includes(j.status) && (
                    <Button size="sm" variant="ghost" onClick={() => { const v = prompt("Reschedule to (YYYY-MM-DD HH:MM):"); if (v) action(j.id, "reschedule", new Date(v).toISOString()); }}>Reschedule</Button>
                  )}
                  {j.status !== "published" && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => action(j.id, "cancel")}>Cancel</Button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
