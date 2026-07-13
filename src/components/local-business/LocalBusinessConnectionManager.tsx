"use client";

import { useEffect, useState, useCallback } from "react";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { GoogleConnectionCard } from "./GoogleConnectionCard";

type Account = { id: string; google_email: string | null; status: string; expires_at: string | null; last_synced_at: string | null; connected_at: string };

export function LocalBusinessConnectionManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [liveApi, setLiveApi] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/local-business/accounts").then((r) => r.json()).then((j) => { setAccounts(j.accounts ?? []); setLiveApi(!!j.liveApi); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div>;

  return (
    <div className="space-y-4">
      <GoogleConnectionCard accounts={accounts} liveApi={liveApi} onChange={load} />

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold">Enabling live Google Business Profile access</h2>
        </div>
        <ol className="mt-2 ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Create (or reuse) a Google Cloud project and enable the <strong>Business Profile APIs</strong>.</li>
          <li>Apply for Business Profile API access — Google reviews and approves this separately (it can take time).</li>
          <li>Configure the OAuth consent screen with the <code>business.manage</code> scope.</li>
          <li>Add the client ID/secret to CreatorsForge (admin), then reconnect here.</li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          Until access is approved, live reads/writes to Google are unavailable. You can still add locations manually, run audits, and prepare posts &amp; images — we never simulate a successful Google publish.
        </p>
      </Card>
    </div>
  );
}
