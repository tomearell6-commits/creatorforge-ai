"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, RotateCcw, Server, Download } from "lucide-react";
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

export function RenderQueue({
  projectId,
  jobs: initial,
  live = false,
}: {
  projectId: string;
  jobs: RenderJob[];
  live?: boolean;
}) {
  const [jobs, setJobs] = useState(initial);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  // Poll active jobs. With Shotstack, this refreshes the real render status;
  // in placeholder mode it advances the simulated progress.
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
    }, live ? 3500 : 1500);
    return () => clearTimeout(timer);
  }, [jobs, live]);

  async function startRender() {
    setError(null);
    setNeedsUpgrade(false);
    setStarting(true);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setNeedsUpgrade(true);
        setError(data.error || "Not enough credits.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Could not start render.");
      setJobs((prev) => [data.job, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start render.");
    } finally {
      setStarting(false);
    }
  }

  async function retry(id: string) {
    setError(null);
    const res = await fetch("/api/render", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "retry" }),
    });
    const data = await res.json();
    if (res.ok) setJobs((prev) => prev.map((j) => (j.id === data.job.id ? data.job : j)));
    else setError(data.error || "Retry failed.");
  }

  // Cross-origin URLs ignore <a download>; fetch as a blob to force a real download.
  async function downloadFile(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {live
            ? "Renders your scenes + voiceover + captions into an MP4 (5 credits). Takes ~1–2 min."
            : "Placeholder renders — progress is simulated. Set SHOTSTACK_API_KEY for real video."}
        </p>
        <Button onClick={startRender} disabled={starting}>
          <Play className="h-4 w-4" /> {starting ? "Submitting…" : "Render video"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500">
          {error}
          {needsUpgrade && (
            <>
              {" "}
              <Link href="/dashboard/billing" className="font-medium text-brand-600 underline">
                View plans
              </Link>
            </>
          )}
        </p>
      )}

      {jobs.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <Server className="h-8 w-8" />
          <p className="text-sm">No render jobs yet.</p>
        </Card>
      ) : (
        jobs.map((job) => {
          const hasVideo = !!job.output_url && job.output_url.startsWith("http");
          return (
            <Card key={job.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Render · {formatDate(job.created_at)}</CardTitle>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", STATUS_STYLES[job.status])}>
                  {job.status}
                </span>
              </div>

              {job.status !== "done" && (
                <>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-brand-600 transition-all duration-500" style={{ width: `${job.progress}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{job.progress}%</span>
                    <span>Est. ~{job.estimated_seconds}s</span>
                  </div>
                </>
              )}

              {hasVideo && (
                <div className="space-y-2">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video controls src={job.output_url!} className="w-full rounded-lg bg-black" />
                  <button
                    type="button"
                    onClick={() => downloadFile(job.output_url!, `creatorforge-${job.id}.mp4`)}
                    className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                  >
                    <Download className="h-4 w-4" /> Download MP4
                  </button>
                </div>
              )}

              {job.logs && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Logs</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono">{job.logs}</pre>
                </details>
              )}

              {(job.status === "done" || job.status === "failed") && (
                <Button variant="outline" size="sm" onClick={() => retry(job.id)}>
                  <RotateCcw className="h-4 w-4" /> {job.status === "failed" ? "Retry" : "Re-render"}
                </Button>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
