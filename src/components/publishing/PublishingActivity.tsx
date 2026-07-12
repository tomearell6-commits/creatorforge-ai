"use client";

import { useEffect, useState, useMemo } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { BrandIcon, hasBrandIcon } from "@/components/icons/BrandIcon";

type Dest = {
  id: string; job_id: string; content_type: string; destination: string;
  status: string; external_url: string | null; scheduled_for: string | null;
  published_at: string | null; error: string | null; created_at: string;
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  published: "success", scheduled: "info", publishing: "info", export_ready: "warning",
  failed: "danger", cancelled: "default", pending: "default",
};
const STATUS_LABEL: Record<string, string> = {
  published: "Published", scheduled: "Scheduled", publishing: "Publishing", export_ready: "Package ready",
  failed: "Failed", cancelled: "Cancelled", pending: "Draft",
};

function Icon({ slug }: { slug: string }) {
  const key = slug.replace(/_.*$/, "");
  if (hasBrandIcon(key)) return <BrandIcon platform={key} className="h-4 w-4" />;
  return <span className="inline-block h-4 w-4 rounded bg-muted" />;
}

export function PublishingActivity() {
  const [rows, setRows] = useState<Dest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fType, setFType] = useState("all");
  const [fStatus, setFStatus] = useState("all");

  const load = () => {
    setLoading(true);
    fetch("/api/publishing/status").then((r) => r.json()).then((j) => setRows(j.destinations ?? [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.content_type))), [rows]);
  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))), [rows]);
  const filtered = rows.filter((r) => (fType === "all" || r.content_type === fType) && (fStatus === "all" || r.status === fStatus));

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">Publishing activity</h2>
        <Badge variant="default">{rows.length}</Badge>
        <button onClick={load} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" aria-label="Refresh">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Every destination from every publish — tracked independently.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <select value={fType} onChange={(e) => setFType(e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs" aria-label="Filter by content type">
          <option value="all">All types</option>
          {types.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs" aria-label="Filter by status">
          <option value="all">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
        </select>
      </div>

      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing here yet. Publish or schedule something from any finished project and it&rsquo;ll appear here.</p>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <Icon slug={r.destination} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium capitalize">{r.destination.replace(/_/g, " ")}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.content_type.replace(/_/g, " ")}
                  {r.scheduled_for ? ` · ${new Date(r.scheduled_for).toLocaleString()}` : r.published_at ? ` · ${new Date(r.published_at).toLocaleString()}` : ` · ${new Date(r.created_at).toLocaleDateString()}`}
                  {r.error ? ` · ${r.error}` : ""}
                </p>
              </div>
              {r.external_url && <a href={r.external_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline" aria-label="Open published item"><ExternalLink className="h-4 w-4" /></a>}
              <Badge variant={STATUS_VARIANT[r.status] ?? "default"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
