"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, ExternalLink, Copy, Rocket, Trash2 } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { SITE_TEMPLATES, type SiteTemplateId } from "@/lib/build/site";
import { BUILD_CREDIT_COSTS } from "@/config/buildStudio";

type Site = {
  id: string; slug: string; title: string; template: string;
  status: string; live_url: string | null; page_count: number; published_at: string | null;
};

/** Publish a generated blueprint as a real, hosted website. */
export function SitePublishPanel({ projectId, generated }: { projectId: string; generated: boolean }) {
  const [site, setSite] = useState<Site | null>(null);
  const [template, setTemplate] = useState<SiteTemplateId>("modern");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"publish" | "unpublish" | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/build/sites?projectId=${projectId}`)
      .then((r) => r.json())
      .then((j) => {
        const s: Site | undefined = j.sites?.[0];
        if (s) { setSite(s); if (s.template) setTemplate(s.template as SiteTemplateId); }
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(load, [load]);

  async function publish() {
    setBusy("publish"); setMsg(null);
    try {
      const r = await fetch("/api/build/sites/publish", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, template, contactEmail: contactEmail || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 402) { setMsg({ kind: "error", text: "Not enough credits to publish — top up in the Credit Wallet." }); return; }
      if (!r.ok) { setMsg({ kind: "error", text: j.error || "Publishing failed." }); return; }
      setSite(j.site);
      setMsg({ kind: "success", text: `Your site is live — ${j.pages} page${j.pages === 1 ? "" : "s"} published.` });
    } finally { setBusy(null); }
  }

  async function unpublish() {
    setBusy("unpublish"); setMsg(null);
    try {
      const r = await fetch("/api/build/sites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site?.id, action: "unpublish" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ kind: "error", text: j.error || "Couldn't take the site offline." }); return; }
      setSite(j.site);
      setMsg({ kind: "success", text: "Site taken offline — the live URL no longer serves it." });
    } finally { setBusy(null); }
  }

  function copyUrl() {
    if (!site?.live_url) return;
    navigator.clipboard.writeText(site.live_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) return <Card className="flex items-center justify-center py-8"><Spinner className="h-5 w-5" /></Card>;

  const isLive = site?.status === "published" && !!site.live_url;

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-900 text-brand-300"><Globe className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <CardTitle>Publish as a real website</CardTitle>
          <CardDescription>Turn this blueprint into a live, responsive website hosted by CreatorsForge.</CardDescription>
        </div>
        {isLive && <Badge variant="success">live</Badge>}
      </div>

      {msg && <Alert variant={msg.kind === "success" ? "success" : "error"}>{msg.text}</Alert>}

      {!generated ? (
        <Alert variant="warning">Generate the blueprint first — then you can publish it as a website.</Alert>
      ) : (
        <>
          {isLive && site.live_url && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Your live URL</p>
              <p className="mt-1 break-all font-mono text-xs">{site.live_url}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={site.live_url} target="_blank" rel="noreferrer">
                  <Button size="sm"><ExternalLink className="h-3.5 w-3.5" /> Open site</Button>
                </a>
                <Button size="sm" variant="outline" onClick={copyUrl}><Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy link"}</Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{site.page_count} page{site.page_count === 1 ? "" : "s"} · template: {site.template}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground">Template</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {SITE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${template === t.id ? "border-brand-600 bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-100" : "border-border hover:bg-muted"}`}
                >
                  <span className="block font-medium">{t.name}</span>
                  <span className={`mt-0.5 block text-xs ${template === t.id ? "opacity-80" : "text-muted-foreground"}`}>{t.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="site-contact" className="text-xs font-semibold text-muted-foreground">
              Contact email <span className="font-normal">(shown on the site&rsquo;s contact button)</span>
            </label>
            <input
              id="site-contact"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="hello@yourbusiness.com"
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <p className="mt-1 text-xs text-muted-foreground">Leave blank and the button links to your Contact page instead — we never publish a fake address.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={publish} disabled={busy !== null}>
              {busy === "publish" ? <Spinner className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
              {isLive ? "Republish" : "Publish website"} ({BUILD_CREDIT_COSTS.publishSite} cr)
            </Button>
            {isLive && (
              <Button variant="outline" onClick={unpublish} disabled={busy !== null}>
                {busy === "unpublish" ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />} Take offline
              </Button>
            )}
          </div>

          <Alert variant="info">
            Your site is <strong>hosted by CreatorsForge</strong> on a separate, sandboxed domain (never on creatorsforge.io itself, for security).
            You can take it offline any time. A custom domain isn&rsquo;t supported yet — that&rsquo;s coming next.
          </Alert>
        </>
      )}
    </Card>
  );
}
