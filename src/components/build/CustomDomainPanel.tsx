"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe2, Check, RefreshCw, Trash2, Lock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

type DnsRecord = { type: string; name: string; value: string };
type Site = { id: string; custom_domain: string | null; domain_status: string; domain_error: string | null };

/**
 * Connect a customer's own domain to a published site (Business/Enterprise).
 * Vercel issues the SSL certificate once their DNS resolves — we only ever show
 * "live" when Vercel confirms it.
 */
export function CustomDomainPanel({
  site, allowed, onChanged,
}: {
  site: Site;
  allowed: boolean;
  onChanged: (site: Site) => void;
}) {
  const [domain, setDomain] = useState(site.custom_domain ?? "");
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const status = site.domain_status ?? "none";
  const connected = !!site.custom_domain;
  const verified = status === "verified";

  async function call(action: "attach" | "verify" | "remove") {
    setBusy(action); setMsg(null);
    try {
      const r = await fetch("/api/build/sites/domain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site.id, action, domain: action === "attach" ? domain : undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ kind: "error", text: j.error || "Something went wrong." }); return; }

      onChanged(j.site);
      setRecords(j.config?.records ?? []);
      if (action === "remove") { setDomain(""); setMsg({ kind: "success", text: "Domain disconnected." }); return; }
      if (j.site?.domain_status === "verified") {
        setMsg({ kind: "success", text: `${j.site.custom_domain} is live 🎉` });
      } else {
        setMsg({ kind: "error", text: "DNS isn't pointing here yet — add the record below, then Verify. It can take a few minutes." });
      }
    } finally { setBusy(null); }
  }

  if (!allowed) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted"><Lock className="h-4 w-4 text-muted-foreground" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Use your own domain</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Serve this site at <strong>your-business.com</strong> instead of a CreatorsForge link, with SSL included.
              Available on <strong>Business</strong> and <strong>Enterprise</strong>.
            </p>
          </div>
          <Link href="/dashboard/billing"><Button size="sm" variant="outline">Upgrade</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Globe2 className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Your own domain</p>
        {verified && <Badge variant="success">live</Badge>}
        {connected && !verified && <Badge variant="warning">pending DNS</Badge>}
      </div>

      {msg && <Alert variant={msg.kind === "success" ? "success" : "error"}>{msg.text}</Alert>}
      {site.domain_error && <Alert variant="error">{site.domain_error}</Alert>}

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="mybusiness.com"
          disabled={busy !== null}
          className="h-10 min-w-[220px] flex-1 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        <Button size="sm" onClick={() => call("attach")} disabled={busy !== null || !domain.trim()}>
          {busy === "attach" ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          {connected ? "Update" : "Connect"}
        </Button>
        {connected && (
          <>
            <Button size="sm" variant="outline" onClick={() => call("verify")} disabled={busy !== null}>
              {busy === "verify" ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />} Verify
            </Button>
            <Button size="sm" variant="ghost" onClick={() => call("remove")} disabled={busy !== null}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          </>
        )}
      </div>

      {verified && site.custom_domain && (
        <a href={`https://${site.custom_domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          https://{site.custom_domain} <ExternalLink className="h-3 w-3" />
        </a>
      )}

      {connected && !verified && records.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-semibold">Add this at your DNS provider, then click Verify</p>
          <div className="mt-2 space-y-2">
            {records.map((r, i) => (
              <div key={i} className="grid gap-1 font-mono text-xs sm:grid-cols-[70px_110px_1fr]">
                <span className="text-muted-foreground">{r.type}</span>
                <span className="truncate">{r.name}</span>
                <span className="break-all">{r.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            If your DNS is on Cloudflare, set the record to <strong>DNS only</strong> (grey cloud) — proxying breaks the certificate.
            DNS can take a few minutes to propagate.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        You keep ownership of the domain. We add it to our hosting so the certificate is issued and renewed automatically — remove it here any time.
      </p>
    </div>
  );
}
