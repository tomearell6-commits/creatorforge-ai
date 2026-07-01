"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { KeyRound, ShieldCheck } from "lucide-react";
import { StatusPill } from "./InfraProviders";

type Provider = {
  id: string; name: string; category: string; authType: string; configured: boolean; status: string; docsUrl?: string;
};

/**
 * Key inventory. CreatorsForge stores provider secrets in environment variables
 * (and per-user WordPress passwords encrypted at rest), so this view never has —
 * and never shows — the actual key. It reports which providers are configured,
 * their auth type, and links to rotate at the source.
 */
export function InfraApiKeys() {
  const [providers, setProviders] = useState<Provider[]>([]);
  useEffect(() => { fetch("/api/admin/infra/providers").then((r) => r.json()).then((d) => setProviders(d.providers ?? [])); }, []);

  const keyed = providers.filter((p) => p.authType === "api_key" || p.authType === "oauth" || p.authType === "hmac_webhook");

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-2 bg-muted/40 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />
        Secrets are stored in environment variables (and encrypted at rest for per-user credentials). Full keys are never displayed here or sent to the browser. Rotate at the provider, then update the env value.
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Provider</th><th className="p-3">Category</th><th className="p-3">Auth type</th><th className="p-3">Key</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {keyed.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="p-3 font-medium"><span className="inline-flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5 text-muted-foreground" />{p.name}</span></td>
                <td className="p-3 capitalize text-muted-foreground">{p.category}</td>
                <td className="p-3">{p.authType.replace("_", " ")}</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{p.configured ? "••••••••  (env)" : "—"}</td>
                <td className="p-3"><StatusPill status={p.configured ? "healthy" : "not_configured"} /></td>
                <td className="p-3 text-right">
                  {p.docsUrl
                    ? <Button asChild size="sm" variant="outline"><a href={p.docsUrl} target="_blank" rel="noopener noreferrer">Rotate at provider</a></Button>
                    : <span className="text-xs text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
