"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, ShieldAlert, RotateCcw, Globe } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type Site = {
  id: string; user_id: string; slug: string; title: string; template: string;
  status: string; live_url: string | null; page_count: number; bytes: number;
  removed_reason: string | null; removed_at: string | null; published_at: string | null;
};

const FILTERS = [
  { id: "published", label: "Live" },
  { id: "removed", label: "Taken down" },
  { id: "", label: "All" },
] as const;

/** Moderation for user-published websites — we host them, so we must be able to
 *  take them down. A takedown deletes the files, not just a flag. */
export function AdminBuildSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [filter, setFilter] = useState<string>("published");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/build-sites${filter ? `?status=${filter}` : ""}`)
      .then((r) => r.json())
      .then((j) => setSites(j.sites ?? []))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(load, [load]);

  async function takedown(site: Site) {
    const reason = window.prompt(`Take down "${site.title}"?\n\nThis DELETES the hosted files immediately — the live URL stops working.\n\nReason (recorded on the site):`);
    if (!reason?.trim()) return;
    setBusy(site.id); setMsg(null);
    try {
      const r = await fetch("/api/admin/build-sites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site.id, action: "takedown", reason }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ kind: "error", text: j.error || "Takedown failed." }); return; }
      setMsg({ kind: "success", text: `"${site.title}" taken down — files deleted, URL is dead.` });
      load();
    } finally { setBusy(null); }
  }

  async function restore(site: Site) {
    setBusy(site.id); setMsg(null);
    try {
      const r = await fetch("/api/admin/build-sites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site.id, action: "restore" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ kind: "error", text: j.error || "Restore failed." }); return; }
      setMsg({ kind: "success", text: j.note ?? "Flag cleared." });
      load();
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <Alert variant="info" title="You are hosting these">
        Every site below is user-generated HTML served from your infrastructure. Sites run in a sandboxed origin (they can&rsquo;t touch app sessions),
        but you remain responsible for what&rsquo;s published. A takedown <strong>deletes the files immediately</strong> — it isn&rsquo;t reversible without the owner republishing.
      </Alert>

      {msg && <Alert variant={msg.kind === "success" ? "success" : "error"}>{msg.text}</Alert>}

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id || "all"}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-xs ${filter === f.id ? "bg-brand-900 text-brand-300" : "text-muted-foreground hover:bg-muted"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="flex items-center justify-center py-10"><Spinner className="h-5 w-5" /></Card>
      ) : sites.length === 0 ? (
        <EmptyState icon={Globe} title="No sites here" description="Nothing matches this filter yet." />
      ) : (
        <div className="space-y-2">
          {sites.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.title}</span>
                  {s.status === "published" && <Badge variant="success">live</Badge>}
                  {s.status === "removed" && <Badge variant="danger">taken down</Badge>}
                  {s.status === "unpublished" && <Badge variant="default">offline</Badge>}
                </div>
                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">/s/{s.slug}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.page_count} page{s.page_count === 1 ? "" : "s"} · {Math.round(s.bytes / 1024)} KB · owner {s.user_id.slice(0, 8)}…
                </p>
                {s.removed_reason && (
                  <p className="mt-1 text-xs text-red-600">Taken down: {s.removed_reason}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {s.live_url && (
                  <a href={s.live_url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5" /> View</Button>
                  </a>
                )}
                {s.status === "published" ? (
                  <Button size="sm" variant="outline" onClick={() => takedown(s)} disabled={busy === s.id}>
                    {busy === s.id ? <Spinner className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />} Take down
                  </Button>
                ) : s.status === "removed" ? (
                  <Button size="sm" variant="ghost" onClick={() => restore(s)} disabled={busy === s.id}>
                    <RotateCcw className="h-3.5 w-3.5" /> Clear flag
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
