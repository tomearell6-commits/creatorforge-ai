"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { BrevoSyncPanel } from "./BrevoSyncPanel";

type Template = { id: string; name: string };
type LeadList = { id: string; name: string; member_count?: number };
type EmailCampaign = {
  id: string;
  name: string;
  status?: string;
  sent?: number;
  opened?: number;
  clicked?: number;
  bounced?: number;
};

export function BrevoCampaigns() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[] | null>(null);

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [listId, setListId] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ variant: "success" | "warning"; text: string } | null>(null);

  async function loadCampaigns() {
    try {
      // Campaign send-stats are surfaced through the reports endpoint (recentCampaigns).
      const rep = await fetch("/api/leads/reports").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      setCampaigns(
        (rep?.recentCampaigns ?? []).map((c: { id: string; name: string; sent?: number }) => ({
          id: c.id,
          name: c.name,
          sent: c.sent,
        }))
      );
    } catch {
      setCampaigns([]);
    }
  }

  useEffect(() => {
    fetch("/api/leads/templates")
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((d) => {
        setTemplates(d.templates ?? []);
        if (d.templates?.[0]) setTemplateId(d.templates[0].id);
      })
      .catch(() => setTemplates([]));
    fetch("/api/leads/lists")
      .then((r) => (r.ok ? r.json() : { lists: [] }))
      .then((d) => {
        setLists(d.lists ?? []);
        if (d.lists?.[0]) setListId(d.lists[0].id);
      })
      .catch(() => setLists([]));
    loadCampaigns();
  }, []);

  async function createAndSend(send: boolean) {
    if (!name.trim() || !templateId || !listId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const createRes = await fetch("/api/leads/brevo/create-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, listId, name: name.trim() }),
      });
      if (!createRes.ok) throw new Error((await createRes.json().catch(() => ({})))?.error || "Could not create campaign.");
      const { campaign, configured } = await createRes.json();
      if (!configured) {
        setNotice({ variant: "warning", text: "Connect Brevo (BREVO_API_KEY) to enable outreach." });
        return;
      }

      if (send) {
        const sendRes = await fetch("/api/leads/brevo/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: campaign.id }),
        });
        if (!sendRes.ok) throw new Error((await sendRes.json().catch(() => ({})))?.error || "Send failed.");
        const { configured: sendConfigured } = await sendRes.json();
        setNotice(
          sendConfigured
            ? { variant: "success", text: `Campaign "${name.trim()}" sent.` }
            : { variant: "warning", text: "Connect Brevo (BREVO_API_KEY) to enable outreach." }
        );
      } else {
        setNotice({ variant: "success", text: `Campaign "${name.trim()}" created as a draft.` });
      }
      setName("");
      await loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const canCreate = name.trim().length > 0 && Boolean(templateId) && Boolean(listId) && !busy;

  return (
    <div className="space-y-6">
      <BrevoSyncPanel />

      <Card className="space-y-4">
        <div>
          <CardTitle>Email campaign</CardTitle>
          <CardDescription>Pick a template and a list, then create a draft or send it via Brevo.</CardDescription>
        </div>

        <div>
          <Label htmlFor="camp-name">Campaign name</Label>
          <Input id="camp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sydney pet shops — intro" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="camp-template">Template</Label>
            <select
              id="camp-template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {templates.length === 0 && <option value="">No templates — create one first</option>}
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="camp-list">Lead list</Label>
            <select
              id="camp-list"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {lists.length === 0 && <option value="">No lists — create one first</option>}
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {typeof l.member_count === "number" ? ` (${l.member_count})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <Alert variant="error" title="Campaign error">{error}</Alert>}
        {notice && <Alert variant={notice.variant === "success" ? "success" : "warning"}>{notice.text}</Alert>}

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" disabled={!canCreate} onClick={() => createAndSend(false)}>
            {busy ? <><Spinner size="sm" /> Working…</> : "Create draft"}
          </Button>
          <Button variant="accent" disabled={!canCreate} onClick={() => createAndSend(true)}>
            <Send className="h-4 w-4" aria-hidden /> Create &amp; send
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        <CardTitle className="text-base">Email campaigns</CardTitle>
        {campaigns === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" /> Loading campaigns…
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState icon={Send} title="No email campaigns yet" description="Create a campaign above to start outreach." />
        ) : (
          <ul className="space-y-2">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Card className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Sent {c.sent ?? 0}</span>
                      <span>Opened {c.opened ?? 0}</span>
                      <span>Clicked {c.clicked ?? 0}</span>
                      <span>Bounced {c.bounced ?? 0}</span>
                    </p>
                  </div>
                  {c.status && <Badge variant="info">{c.status}</Badge>}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
