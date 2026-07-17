"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, Rocket, PenLine, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

type Site = {
  id: string; slug: string; status: string; live_url: string | null;
  custom_domain: string | null; domain_status: string;
};

type Device = "desktop" | "tablet" | "mobile";

/** Viewport widths we frame the site at. Desktop fills the container. */
const DEVICES: { id: Device; label: string; icon: typeof Monitor; width: number | null }[] = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: null },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 768 },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 390 },
];

/**
 * Live, in-app preview of the user's OWN published site.
 *
 * This works precisely because WE host the site (/s/{slug}) and control its
 * headers — no X-Frame-Options blocks it, and its own `CSP: sandbox` keeps it
 * safe inside the iframe. We deliberately do NOT try to embed arbitrary external
 * sites here: most of the web sends X-Frame-Options: DENY and would render blank.
 *
 * Because it's their real site, internal links work — clicking a nav link
 * navigates the frame, so this doubles as a mini-browser of their own pages.
 */
export function SitePreviewPanel({
  projectId, onEditPages, onOpenPublish,
}: {
  projectId: string;
  onEditPages?: () => void;
  onOpenPublish?: () => void;
}) {
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<Device>("desktop");
  const [frameLoading, setFrameLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetch(`/api/build/sites?projectId=${projectId}`)
      .then((r) => r.json())
      .then((j) => setSite(j.sites?.[0] ?? null))
      .finally(() => setLoading(false));
  }, [projectId]);

  const refresh = useCallback(() => { setFrameLoading(true); setReloadKey((k) => k + 1); }, []);

  if (loading) return <div className="flex items-center justify-center py-12"><Spinner className="h-5 w-5" /></div>;

  const isLive = site?.status === "published" && !!site.live_url;

  if (!isLive || !site?.live_url) {
    return (
      <Alert variant="info">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>Publish your site first — then you can preview and browse it right here, on desktop, tablet and mobile.</span>
          {onOpenPublish && <Button size="sm" onClick={onOpenPublish}><Rocket className="h-4 w-4" /> Go to Publish</Button>}
        </div>
      </Alert>
    );
  }

  const width = DEVICES.find((d) => d.id === device)?.width ?? null;
  const domainLive = site.domain_status === "verified" && !!site.custom_domain;

  // Preview from the SAME origin as the dashboard (the app domain), not the
  // public sites domain: it always resolves here, avoids any dedicated-domain
  // DNS propagation delay, and is still CSP-sandboxed by the /s route. The
  // address bar below still shows the real public URL visitors get.
  const previewSrc = `/s/${site.slug}`;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {DEVICES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDevice(d.id)}
              aria-pressed={device === d.id}
              title={d.label}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                device === d.id ? "bg-brand-900 text-brand-100" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <d.icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{d.label}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          {onEditPages && <Button size="sm" variant="secondary" onClick={onEditPages}><PenLine className="h-3.5 w-3.5" /> Edit pages</Button>}
          <a href={site.live_url} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /> Open</Button>
          </a>
        </div>
      </div>

      {/* Address bar — shows what visitors would see */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
        <Globe2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-mono text-xs text-muted-foreground">{domainLive ? `https://${site.custom_domain}` : site.live_url}</span>
        {domainLive
          ? <Badge variant="success">your domain</Badge>
          : <Badge variant="brand">preview URL</Badge>}
      </div>

      {/* Framed site */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20">
        {frameLoading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Spinner className="h-5 w-5" />
          </div>
        )}
        <div className="flex justify-center overflow-x-auto p-3">
          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={previewSrc}
            title="Website preview"
            onLoad={() => setFrameLoading(false)}
            // Defense in depth: the served page already carries CSP: sandbox.
            // allow-same-origin lets its own relative links resolve for in-frame
            // browsing; no allow-scripts — our generated sites are HTML + CSS.
            sandbox="allow-same-origin allow-popups"
            className="h-[640px] rounded-lg border border-border bg-white shadow-sm transition-[width] duration-200"
            style={{ width: width ? `${width}px` : "100%", maxWidth: "100%" }}
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        This is your live site. Click links inside to browse your pages. Changes you make in{" "}
        <button onClick={onEditPages} className="underline underline-offset-2">Pages &amp; Copy</button> appear here after you republish.
      </p>
    </div>
  );
}
