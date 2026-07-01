"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { LEAD_CREDIT_COSTS } from "@/lib/leads/constants";

type Campaign = { id: string; name: string; unverified_count?: number };

export function EmailVerificationPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [selected, setSelected] = useState<string>("all");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ verified: number; stopped: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/leads/campaigns/status")
      .then((r) => (r.ok ? r.json() : { campaigns: [] }))
      .then((d) => setCampaigns(d.campaigns ?? []))
      .catch(() => setCampaigns([]));
  }, []);

  const active = selected === "all" ? null : campaigns?.find((c) => c.id === selected) ?? null;
  const unverified =
    selected === "all"
      ? (campaigns ?? []).reduce((sum, c) => sum + (c.unverified_count ?? 0), 0)
      : active?.unverified_count ?? 0;

  async function verify() {
    setVerifying(true);
    setError(null);
    setResult(null);
    try {
      const body = selected === "all" ? {} : { campaignId: selected };
      const res = await fetch("/api/leads/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Verification failed.");
      setResult((await res.json()) as { verified: number; stopped: boolean });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <CardTitle>Verify email deliverability</CardTitle>
        <CardDescription>
          Check emails before outreach to protect your sender reputation. {LEAD_CREDIT_COSTS.emailVerify} credit per email verified.
        </CardDescription>
      </div>

      {campaigns === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" /> Loading campaigns…
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="verify-campaign">Campaign</Label>
            <select
              id="verify-campaign"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="all">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{unverified}</strong> unverified email{unverified === 1 ? "" : "s"} in scope
            {unverified > 0 && <> — est. {unverified * LEAD_CREDIT_COSTS.emailVerify} credits.</>}
          </p>

          {error && <Alert variant="error" title="Verification failed">{error}</Alert>}
          {result && (
            <Alert variant={result.stopped ? "warning" : "success"} title={result.stopped ? "Stopped early" : "Verification complete"}>
              Verified <strong>{result.verified}</strong> email{result.verified === 1 ? "" : "s"}.
              {result.stopped && " Verification stopped — you may have run out of credits."}
            </Alert>
          )}

          <Button onClick={verify} disabled={verifying} variant="accent">
            {verifying ? <><Spinner size="sm" /> Verifying…</> : "Verify emails"}
          </Button>
        </>
      )}
    </Card>
  );
}
