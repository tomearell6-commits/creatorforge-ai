"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, RotateCcw, Server, Download } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { cn, formatDate } from "@/lib/utils";
import { RENDER_TIERS } from "@/lib/constants";
import type { RenderJob } from "@/lib/types";
import { ContentCompletionPanel } from "@/components/publishing/ContentCompletionPanel";

const STATUS_VARIANT = {
  queued: "warning",
  processing: "warning",
  done: "success",
  failed: "danger",
} as const;

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
  const [tierId, setTierId] = useState<string>("slideshow");

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
        body: JSON.stringify({ projectId, mode: tierId }),
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

  const tier = RENDER_TIERS.find((t) => t.id === tierId) ?? RENDER_TIERS[0];

  return (
    <div className="space-y-5">
      {/* Render mode / tier picker */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {RENDER_TIERS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTierId(t.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              tierId === t.id ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20" : "border-border hover:border-brand-300"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{t.label}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t.credits} cr</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {!live
            ? "Placeholder renders — progress is simulated. Set SHOTSTACK_API_KEY for real video."
            : tier.model
              ? `${tier.label}: generates real AI footage per scene, then assembles with voiceover + captions. Takes ~10–30 min (${tier.credits} credits).`
              : `Slideshow: AI images + motion + captions → MP4 (${tier.credits} credits). ~1–2 min.`}
        </p>
        <Button onClick={startRender} disabled={starting}>
          <Play className="h-4 w-4" /> {starting ? "Submitting…" : tier.model ? "Generate AI video" : "Render video"}
        </Button>
      </div>

      {error && (
        <Alert
          variant="error"
          action={needsUpgrade ? (
            <Link href="/dashboard/billing" className="font-medium text-brand-600 underline">
              View plans
            </Link>
          ) : undefined}
        >
          {error}
        </Alert>
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
                <Badge variant={STATUS_VARIANT[job.status] ?? "default"}>{job.status}</Badge>
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
                  <ContentCompletionPanel
                    contentType="ai_video"
                    sourceKind="video"
                    sourceId={job.project_id ?? job.id}
                    assetUrl={job.output_url}
                    downloadUrl={job.output_url}
                  />
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
