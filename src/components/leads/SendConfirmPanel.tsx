"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export type SendConfirmCampaign = {
  id: string;
  name?: string;
  subject?: string;
  listId?: string;
  recipients?: number;
};

/**
 * Final send confirmation. Shows a preview (recipient count, subject, unsubscribe
 * note), requires an explicit compliance confirmation, then records a send
 * approval before triggering the Brevo send. Any block reason from the send route
 * (not approved / limits / credits) is surfaced as an Alert.
 */
export function SendConfirmPanel({
  campaign,
  onSent,
}: {
  campaign: SendConfirmCampaign;
  onSent?: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const recipients = campaign.recipients ?? 0;

  async function confirmAndSend() {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      // 1) Record the manual-review approval the send route requires.
      const approveRes = await fetch("/api/leads/send-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailCampaignId: campaign.id,
          listId: campaign.listId,
          recipients,
          confirmedCompliance: true,
        }),
      });
      if (!approveRes.ok)
        throw new Error((await approveRes.json().catch(() => ({})))?.error || "Could not record approval.");

      // 2) Send.
      const sendRes = await fetch("/api/leads/brevo/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });
      const data = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) throw new Error(data?.error || "Send failed.");
      if (data?.configured === false) {
        setError("Connect Brevo (BREVO_API_KEY) to enable outreach.");
        return;
      }
      setDone(true);
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <CardTitle>Review &amp; send</CardTitle>
        <CardDescription>Confirm this outreach before it goes out. This step is required and logged.</CardDescription>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-muted-foreground">Campaign</dt>
          <dd className="font-medium">{campaign.name ?? campaign.id}</dd>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-muted-foreground">Recipients</dt>
          <dd className="font-medium">{recipients}</dd>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-muted-foreground">Subject</dt>
          <dd className="font-medium">{campaign.subject ?? "—"}</dd>
        </div>
      </dl>

      <Alert variant="info">
        An unsubscribe footer and your business address are appended to every email automatically.
      </Alert>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        <span>I confirm this outreach is compliant, permission-based, and reviewed.</span>
      </label>

      {error && <Alert variant="error" title="Send blocked">{error}</Alert>}
      {done && <Alert variant="success">Campaign sent.</Alert>}

      <div className="flex justify-end">
        <Button variant="accent" disabled={!confirmed || busy || done} onClick={confirmAndSend}>
          {busy ? (
            <>
              <Spinner size="sm" /> Sending…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden /> Confirm &amp; Send
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
