"use client";

import { useEffect, useState } from "react";
import { Play, RotateCcw, Server } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn, formatDate } from "@/lib/utils";
import type { RenderJob } from "@/lib/types";

const STATUS_STYLES: Record<RenderJob["status"], string> = {
  queued: "bg-muted text-foreground",
  processing: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export function RenderQueue({ projectId, jobs: initial }: { projectId: string; jobs: RenderJob[] }) {
  const [jobs, setJobs] = useState(initial);
  const [starting, setStarting] = useState(false);

  // Simulate placeholder render progress: advance one active job every 1.5s.
  useEffect(() => {
    const active = jobs.find((j) => j.status === "queued" || j.status === "processing");
    if (!active) return;
    const timer = setTimeout(async () => {
      const res = await fetch("/api/render", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: active.id, action: "advance" }),
      });
      const data = await res.json();
      if (res.ok) setJobs((prev) => prev.map((j) => (j.id === data.job.id ? data.job : j)));
    }, 1500);
    return () => clearTimeout(timer);
  }, [jobs]);

  async function startRender() {
    setStarting(true);
    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json();
    if (res.ok) setJobs((prev) => [data.job, ...prev]);
    setStarting(false);
  }

  async function retry(id: string) {
    const res = await fetch("/api/render", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "retry" }),
    });
    const data = await res.json();
    if (res.ok) setJobs((prev) => prev.map((j) => (j.id === data.job.id ? data.job : j)));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Placeholder renders — progress is simulated; no final video is produced yet.
        </p>
        <Button onClick={startRender} disabled={starting}>
          <Play className="h-4 w-4" /> {starting ? "Queuing…" : "Start render"}
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <Server className="h-8 w-8" />
          <p className="text-sm">No render jobs yet.</p>
        </Card>
      ) : (
        jobs.map((job) => (
          <Card key={job.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Render · {formatDate(job.created_at)}</CardTitle>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", STATUS_STYLES[job.status])}>
                {job.status}
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-brand-600 transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{job.progress}%</span>
              <span>Est. ~{job.estimated_seconds}s</span>
            </div>

            {job.logs && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Logs</summary>
                <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono">{job.logs}</pre>
              </details>
            )}

            {(job.status === "done" || job.status === "failed") && (
              <Button variant="outline" size="sm" onClick={() => retry(job.id)}>
                <RotateCcw className="h-4 w-4" /> Retry
              </Button>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
