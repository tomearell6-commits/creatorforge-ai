"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { BrandIcon, hasBrandIcon } from "@/components/icons/BrandIcon";
import { SOCIAL_PROVIDERS, type SocialProviderId } from "@/config/socialProviderCapabilities";

type Job = { id: string; platform: string; status: string; external_url: string | null; error: string | null; scheduled_for: string | null; published_at: string | null; created_at: string };

const STATUS_VARIANT: Record<string, "default" | "info" | "success" | "warning" | "danger"> = {
  pending: "default", publishing: "info", scheduled: "info", published: "success",
  failed: "danger", cancelled: "default", unavailable: "warning", export_ready: "warning",
};
const STATUS_LABEL: Record<string, string> = { unavailable: "Not live yet", export_ready: "Ready to post", published: "Published", scheduled: "Scheduled", failed: "Failed", pending: "Draft", publishing: "Publishing", cancelled: "Cancelled" };

function Icon({ slug }: { slug: string }) { return hasBrandIcon(slug) ? <BrandIcon platform={slug} className="h-4 w-4" /> : <span className="inline-block h-4 w-4 rounded bg-muted" />; }

export function SocialPublishingQueue({ mode }: { mode: "queue" | "calendar" }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/social-business/publish/status").then((r) => r.json()).then((j) => setJobs(j.jobs ?? [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = mode === "calendar" ? jobs.filter((j) => j.scheduled_for) : jobs;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">{mode === "calendar" ? "Scheduled posts" : "Publishing queue"}</h2>
        <Badge variant="default">{shown.length}</Badge>
        <button onClick={load} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Each platform is tracked independently — one failing never fails the others.</p>
      <div className="mt-3 space-y-2">
        {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div>
          : shown.length === 0 ? <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing here yet. Publish or schedule from the Content Generator or a campaign.</p>
          : shown.map((j) => (
            <div key={j.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <Icon slug={j.platform} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{SOCIAL_PROVIDERS[j.platform as SocialProviderId]?.name ?? j.platform}</p>
                <p className="truncate text-xs text-muted-foreground">{j.scheduled_for ? new Date(j.scheduled_for).toLocaleString() : new Date(j.created_at).toLocaleDateString()}{j.error ? ` · ${j.error}` : ""}</p>
              </div>
              {j.external_url && <a href={j.external_url} target="_blank" rel="noreferrer" className="text-brand-600" aria-label="Open"><ExternalLink className="h-4 w-4" /></a>}
              <Badge variant={STATUS_VARIANT[j.status] ?? "default"}>{STATUS_LABEL[j.status] ?? j.status}</Badge>
            </div>
          ))}
      </div>
    </Card>
  );
}
