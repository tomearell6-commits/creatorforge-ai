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
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");
  function load() { fetch("/api/autopilot/queue").then((r) => r.json()).then((d) => setJobs(d.jobs ?? [])); }
  useEffect(() => { load(); }, []);

  async function action(jobId: string, action: string, scheduledTime?: string) {
    await fetch("/api/autopilot/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, action, scheduledTime }) });
    load();
  }

  function openReschedule(job: any) {
    // Prefill with the job's current scheduled time (as a local datetime-local value) when available.
    const base = job.scheduled_time ? new Date(job.scheduled_time) : new Date();
    const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setRescheduleValue(local);
    setRescheduling(job.id);
  }
  function submitReschedule(jobId: string) {
    if (!rescheduleValue) return;
    action(jobId, "reschedule", new Date(rescheduleValue).toISOString());
    setRescheduling(null);
    setRescheduleValue("");
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
                    <Button size="sm" variant="ghost" onClick={() => openReschedule(j)}>Reschedule</Button>
                  )}
                  {j.status !== "published" && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => action(j.id, "cancel")}>Cancel</Button>}
                </div>
                {rescheduling === j.id && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
                    <label htmlFor={`reschedule-${j.id}`} className="sr-only">Reschedule date and time</label>
                    <input
                      id={`reschedule-${j.id}`}
                      type="datetime-local"
                      value={rescheduleValue}
                      onChange={(e) => setRescheduleValue(e.target.value)}
                      autoFocus
                      className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    />
                    <Button size="sm" onClick={() => submitReschedule(j.id)} disabled={!rescheduleValue}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRescheduling(null); setRescheduleValue(""); }}>Cancel</Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
