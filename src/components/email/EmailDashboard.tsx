"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, RefreshCw, AlertTriangle, PenLine, ListChecks, Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { useEmailData, classificationOf, EmailPriorityBadge, EmailCategoryBadge } from "./EmailShared";
import { EMAIL_CREDIT_COSTS } from "@/lib/email-assistant/safety";

/** Email Dashboard: accounts, sync, InboxSummaryCard stats + latest messages. */
export function EmailDashboard() {
  const { accounts, messages, loading, error, reload } = useEmailData();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<{ v: "success" | "error"; t: string } | null>(null);

  const sync = async (accountId: string) => {
    setSyncing(accountId);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/email/sync", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId }),
      });
      const json = await res.json();
      if (res.status === 402) throw new Error("Not enough credits for the scan. Top up in Credit Wallet.");
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      setSyncMsg({ v: "success", t: `Synced: ${json.fetched} fetched, ${json.classified} classified${json.critical ? `, ${json.critical} critical` : ""}${json.creditsUsed ? ` · ${json.creditsUsed} credits` : " · free"}` });
      await reload();
    } catch (e) {
      setSyncMsg({ v: "error", t: e instanceof Error ? e.message : "Sync failed" });
    } finally {
      setSyncing(null);
    }
  };

  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading…</div>;
  if (error) return <Alert variant="error">{error}</Alert>;

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
        <Mail className="mb-2 h-8 w-8 text-brand-500" />
        <p className="text-sm font-medium">No email account connected</p>
        <p className="mb-3 text-xs text-muted-foreground">Connect Gmail/Outlook — or try the Demo Inbox to see the full flow instantly.</p>
        <Button asChild size="sm"><Link href="/dashboard/email/connect"><Plus className="h-4 w-4" /> Connect Email</Link></Button>
      </div>
    );
  }

  const stats = messages.reduce(
    (acc, m) => {
      const c = classificationOf(m);
      if (!c) return acc;
      if (c.priority === "critical") acc.critical++;
      if (c.needs_reply) acc.needsReply++;
      if (c.category === "sales_lead") acc.leads++;
      return acc;
    },
    { critical: 0, needsReply: 0, leads: 0 }
  );

  return (
    <div className="space-y-5">
      {/* Accounts + sync */}
      <div className="space-y-2">
        {accounts.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
            <div>
              <div className="text-sm font-medium">{a.display_name ?? a.email_address} <span className="text-xs text-muted-foreground">({a.provider})</span></div>
              <div className="text-xs text-muted-foreground">
                Mode: {a.permission_mode.replace(/_/g, " ")} · Last sync: {a.last_synced_at ? new Date(a.last_synced_at).toLocaleString() : "never"}
                {a.last_sync_error && <span className="text-red-600"> · {a.last_sync_error}</span>}
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => sync(a.id)} disabled={syncing === a.id}>
              {syncing === a.id ? <Spinner size="sm" className="text-current" /> : <RefreshCw className="h-4 w-4" />} Scan inbox
              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Coins className="h-3 w-3" /> ~{EMAIL_CREDIT_COSTS.scanPer25}/25</span>
            </Button>
          </div>
        ))}
      </div>
      {syncMsg && <Alert variant={syncMsg.v}>{syncMsg.t}</Alert>}

      {/* InboxSummaryCard */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><div className="text-2xl font-bold">{messages.length}</div><div className="text-xs text-muted-foreground">Messages scanned</div></Card>
        <Link href="/dashboard/email/needs-attention"><Card className="h-full p-4 transition-shadow hover:shadow-md"><div className="flex items-center gap-1 text-2xl font-bold text-red-600">{stats.critical} <AlertTriangle className="h-4 w-4" /></div><div className="text-xs text-muted-foreground">Critical</div></Card></Link>
        <Card className="p-4"><div className="text-2xl font-bold">{stats.needsReply}</div><div className="text-xs text-muted-foreground">Need a reply</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">{stats.leads}</div><div className="text-xs text-muted-foreground">Sales leads</div></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary"><Link href="/dashboard/email/needs-attention"><AlertTriangle className="h-4 w-4" /> Needs Attention</Link></Button>
        <Button asChild size="sm" variant="secondary"><Link href="/dashboard/email/drafts"><PenLine className="h-4 w-4" /> Draft Replies</Link></Button>
        <Button asChild size="sm" variant="secondary"><Link href="/dashboard/email/rules"><ListChecks className="h-4 w-4" /> Automation Rules</Link></Button>
      </div>

      {/* Latest classified messages */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">From</th><th className="px-3 py-2 font-medium">Subject</th>
              <th className="px-3 py-2 font-medium">Category</th><th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 font-medium">Received</th>
            </tr>
          </thead>
          <tbody>
            {messages.slice(0, 15).map((m) => {
              const c = classificationOf(m);
              return (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 font-medium">{m.from_name ?? m.from_address}{m.is_demo && <span className="ml-1 rounded bg-muted px-1 text-[10px] text-muted-foreground">DEMO</span>}</td>
                  <td className="max-w-[280px] truncate px-3 py-2.5">{m.subject}</td>
                  <td className="px-3 py-2.5"><EmailCategoryBadge category={c?.category} /></td>
                  <td className="px-3 py-2.5"><EmailPriorityBadge priority={c?.priority} /></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{m.received_at ? new Date(m.received_at).toLocaleString() : "—"}</td>
                </tr>
              );
            })}
            {messages.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No messages yet — click <strong>Scan inbox</strong> above.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
