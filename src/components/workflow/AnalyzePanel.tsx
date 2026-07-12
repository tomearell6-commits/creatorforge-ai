"use client";

import { useEffect, useState } from "react";
import { X, TrendingUp, CheckCircle2, Clock, Package, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { ContentTypeId } from "@/config/publishingCapabilities";

type Data = {
  status: string;
  publishing: { published: number; scheduled: number; packages: number; failed: number };
  promotions: number;
  sources: { id: string; label: string; live: boolean }[];
  recommendations: string[];
  recentEvents: { event_type: string; platform: string | null; created_at: string }[];
};

export type AnalyzePanelProps = {
  open: boolean;
  onClose: () => void;
  contentType: ContentTypeId;
  projectId: string;
  title?: string;
};

const STATUS_META: Record<string, { label: string; variant: "info" | "success" | "warning" | "default" }> = {
  collecting_data: { label: "Collecting data", variant: "info" },
  report_ready: { label: "Report ready", variant: "success" },
  limited_data: { label: "Limited data", variant: "warning" },
  provider_unavailable: { label: "Provider unavailable", variant: "warning" },
};

export function AnalyzePanel({ open, onClose, contentType, projectId, title }: AnalyzePanelProps) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true); setData(null);
    fetch(`/api/analytics/project?projectType=${contentType}&projectId=${projectId}`)
      .then((r) => r.json()).then((j) => setData(j)).finally(() => setLoading(false));
  }, [open, contentType, projectId]);

  if (!open) return null;
  const sm = data ? STATUS_META[data.status] ?? STATUS_META.collecting_data : null;

  const metric = (label: string, value: number, Icon: typeof CheckCircle2) => (
    <div className="rounded-lg border border-border p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <div className="mt-1 text-xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Analyze performance">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold">Performance{title ? ` · ${title}` : ""}</h2>
            {sm && <Badge variant={sm.variant}>{sm.label}</Badge>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          {loading || !data ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                {metric("Published", data.publishing.published, CheckCircle2)}
                {metric("Scheduled", data.publishing.scheduled, Clock)}
                {metric("Packages", data.publishing.packages, Package)}
                {metric("Failed", data.publishing.failed, AlertTriangle)}
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground">Metrics</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {data.sources.map((s) => (
                    <Badge key={s.id} variant={s.live ? "success" : "default"}>
                      {s.label}{!s.live && " · needs connection"}
                    </Badge>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Views, reach, and impressions become available once the platform account is connected and approved.</p>
              </div>

              {data.recommendations.length > 0 && (
                <div className="rounded-lg border border-brand-500/30 bg-brand-50/50 p-3 dark:bg-brand-950/20">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300"><Sparkles className="h-3.5 w-3.5" /> Recommendations</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
                    {data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {data.recentEvents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Recent activity</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {data.recentEvents.map((e, i) => (
                      <li key={i}>{e.event_type.replace(/\./g, " ")}{e.platform ? ` · ${e.platform}` : ""} · {new Date(e.created_at).toLocaleDateString()}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
