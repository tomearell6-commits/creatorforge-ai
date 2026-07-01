"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { LEAD_CREDIT_COSTS } from "@/lib/leads/constants";

type LeadList = { id: string; name: string; member_count?: number };

export function BrevoSyncPanel() {
  const [lists, setLists] = useState<LeadList[] | null>(null);
  const [listId, setListId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ configured: boolean; synced: number } | null>(null);

  useEffect(() => {
    fetch("/api/leads/lists")
      .then((r) => (r.ok ? r.json() : { lists: [] }))
      .then((d) => {
        setLists(d.lists ?? []);
        if (d.lists?.[0]) setListId(d.lists[0].id);
      })
      .catch(() => setLists([]));
  }, []);

  async function sync() {
    if (!listId) return;
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/leads/brevo/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Sync failed.");
      setResult((await res.json()) as { configured: boolean; synced: number });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <CardTitle>Sync to Brevo</CardTitle>
        <CardDescription>
          Push verified, outreach-eligible leads to a Brevo contact list. 1 credit per {LEAD_CREDIT_COSTS.brevoSyncPer} contacts synced.
        </CardDescription>
      </div>

      {lists === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" /> Loading lists…
        </div>
      ) : lists.length === 0 ? (
        <Alert variant="info">No lead lists yet. Create a list from your leads before syncing.</Alert>
      ) : (
        <>
          <div>
            <Label htmlFor="brevo-list">Lead list</Label>
            <select
              id="brevo-list"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {typeof l.member_count === "number" ? ` (${l.member_count})` : ""}
                </option>
              ))}
            </select>
          </div>

          {error && <Alert variant="error" title="Sync failed">{error}</Alert>}

          {result && !result.configured && (
            <Alert variant="warning" title="Brevo not connected">
              Connect Brevo (BREVO_API_KEY) to enable outreach.
            </Alert>
          )}
          {result && result.configured && (
            <Alert variant="success" title="Synced">
              {result.synced} contact{result.synced === 1 ? "" : "s"} pushed to Brevo.
            </Alert>
          )}

          <Button onClick={sync} disabled={syncing || !listId} variant="accent">
            {syncing ? <><Spinner size="sm" /> Syncing…</> : "Sync to Brevo"}
          </Button>
        </>
      )}
    </Card>
  );
}
