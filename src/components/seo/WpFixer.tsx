"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wand2, Globe, Check, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

type Site = { id: string; site_name: string | null; site_url: string };
type Fix = {
  postId: number; postType: "post" | "page"; url: string; title: string;
  currentMetaTitle: string | null; currentMetaDescription: string | null;
  newMetaTitle: string | null; newMetaDescription: string | null; reasons: string[];
};

/**
 * WordPress SEO Auto-Fix — review & approve. Audits a connected site, proposes
 * AI meta title/description fixes, and applies only the ones the user ticks.
 */
export function WpFixer() {
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState("");
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [auditing, setAuditing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/wordpress/sites").then((r) => r.json()).then((j) => {
      setSites(j.sites ?? []);
      if (j.sites?.[0]) setSiteId(j.sites[0].id);
    }).catch(() => {});
  }, []);

  async function audit() {
    if (!siteId) return;
    setAuditing(true); setMsg(null); setFixes([]); setApplied(new Set());
    try {
      const res = await fetch("/api/wordpress/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteId }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Audit failed." }); return; }
      setFixes(j.fixes ?? []);
      setPicked(Object.fromEntries((j.fixes ?? []).map((f: Fix) => [f.postId, true])));
      if ((j.fixes ?? []).length === 0) setMsg({ kind: "success", text: "No meta-title/description issues found on the pages we checked — nice!" });
    } finally { setAuditing(false); }
  }

  async function applySelected() {
    const chosen = fixes.filter((f) => picked[f.postId] && !applied.has(f.postId));
    if (chosen.length === 0) { setMsg({ kind: "error", text: "Tick at least one fix to apply." }); return; }
    setApplying(true); setMsg(null);
    try {
      const payload = chosen.map((f) => ({ postId: f.postId, postType: f.postType, url: f.url, metaTitle: f.newMetaTitle, metaDescription: f.newMetaDescription }));
      const res = await fetch("/api/wordpress/fix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteId, fixes: payload }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg({ kind: "error", text: "Out of credits — top up in the Credit Wallet." }); return; }
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Apply failed." }); return; }
      const okIds = new Set<number>([...applied, ...(j.results ?? []).filter((r: { ok: boolean }) => r.ok).map((r: { postId: number }) => r.postId)]);
      setApplied(okIds);
      const fails = (j.results ?? []).filter((r: { ok: boolean }) => !r.ok).length;
      setMsg({ kind: fails ? "error" : "success", text: `Applied ${j.applied} fix${j.applied === 1 ? "" : "es"} to WordPress (${j.charged} credits).${fails ? ` ${fails} failed.` : ""}` });
    } finally { setApplying(false); }
  }

  if (sites.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Globe className="mx-auto h-8 w-8 text-brand-600" />
        <h2 className="mt-3 text-lg font-semibold">Connect a WordPress site first</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Connect your site with a WordPress Application Password (secure &amp; revocable — never your main password). Then the AI can audit it and apply approved SEO fixes for you.
        </p>
        <Button asChild className="mt-4"><Link href="/dashboard/seo/sites">Connect WordPress →</Link></Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="wpf-site" className="text-sm font-medium">WordPress site</label>
            <select id="wpf-site" value={siteId} onChange={(e) => setSiteId(e.target.value)} className="mt-1 block h-10 rounded-lg border border-border bg-background px-3 text-sm">
              {sites.map((s) => <option key={s.id} value={s.id}>{s.site_name || s.site_url}</option>)}
            </select>
          </div>
          <Button onClick={audit} disabled={auditing}>{auditing ? <><Spinner className="h-4 w-4" /> Auditing…</> : <><Wand2 className="h-4 w-4" /> Audit &amp; propose fixes</>}</Button>
          <Link href="/dashboard/seo/sites" className="ml-auto text-sm text-brand-600 hover:underline">Manage sites</Link>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Reviews your pages for meta title/description issues and proposes AI-written fixes. Nothing changes until you approve. Applying costs 3 credits per page.</p>
      </Card>

      {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}

      {fixes.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{fixes.length} page{fixes.length === 1 ? "" : "s"} with proposed fixes</p>
            <Button onClick={applySelected} disabled={applying}>{applying ? <><Spinner className="h-4 w-4" /> Applying…</> : "Apply selected to WordPress"}</Button>
          </div>

          <div className="space-y-3">
            {fixes.map((f) => (
              <Card key={f.postId} className={`p-4 ${applied.has(f.postId) ? "border-green-500/50" : ""}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={!!picked[f.postId]} disabled={applied.has(f.postId)} onChange={(e) => setPicked((p) => ({ ...p, [f.postId]: e.target.checked }))} className="mt-1 h-4 w-4" aria-label={`Include fix for ${f.title}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default">{f.postType}</Badge>
                      <a href={f.url} target="_blank" rel="noreferrer" className="truncate font-medium text-brand-600 hover:underline">{f.title}</a>
                      {applied.has(f.postId) && <Badge variant="success"><Check className="h-3 w-3" /> applied</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {f.reasons.map((r, i) => <span key={i} className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"><AlertTriangle className="h-3 w-3" />{r}</span>)}
                    </div>
                    {f.newMetaTitle && (
                      <div className="mt-2 text-sm">
                        <p className="text-xs font-semibold text-muted-foreground">Meta title</p>
                        <p className="text-muted-foreground line-through">{f.currentMetaTitle || "(none)"}</p>
                        <p className="text-green-700 dark:text-green-400">{f.newMetaTitle}</p>
                      </div>
                    )}
                    {f.newMetaDescription && (
                      <div className="mt-2 text-sm">
                        <p className="text-xs font-semibold text-muted-foreground">Meta description</p>
                        <p className="text-muted-foreground line-through">{f.currentMetaDescription || "(none)"}</p>
                        <p className="text-green-700 dark:text-green-400">{f.newMetaDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
