"use client";

/**
 * Email Assistant panels: NeedsAttentionTable, DraftReplyEditor,
 * EmailAutomationRuleBuilder, EmailSummaryReport, EmailNotificationSettings.
 */
import { useCallback, useEffect, useState } from "react";
import { PenLine, Send, Check, X, Trash2, Plus, Coins, Sparkles, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EmailPriorityBadge, EmailCategoryBadge, useEmailData } from "./EmailShared";
import { EMAIL_CATEGORIES, DRAFT_TONES, EMAIL_CREDIT_COSTS, PERMISSION_MODES, type DraftTone } from "@/lib/email-assistant/safety";

// ---------------- Needs Attention ----------------
type AttentionItem = {
  id: string; reason: string; suggested_action: string | null; priority: string; deadline: string | null;
  email_messages: {
    id: string; from_name: string | null; from_address: string | null; subject: string | null; snippet: string | null; received_at: string | null; is_demo: boolean;
    email_classifications: { category: string; summary: string | null; is_sensitive: boolean }[] | null;
    email_draft_replies: { id: string; status: string }[] | null;
  } | null;
};

export function NeedsAttentionTable() {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ v: "success" | "error"; t: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/email/needs-attention", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setItems(json.items ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const draftFor = async (messageId: string) => {
    setBusy(messageId);
    setMsg(null);
    try {
      const res = await fetch("/api/email/draft-reply", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId, tone: "professional" }),
      });
      if (res.status === 402) throw new Error("Not enough credits.");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Draft failed");
      setMsg({ v: "success", t: "Draft prepared — review it on the Draft Replies page." });
      await load();
    } catch (e) {
      setMsg({ v: "error", t: e instanceof Error ? e.message : "Draft failed" });
    } finally {
      setBusy(null);
    }
  };

  const resolve = async (itemId: string) => {
    setBusy(itemId);
    await fetch("/api/email/needs-attention", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, resolved: true }) });
    setBusy(null);
    await load();
  };

  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading…</div>;

  return (
    <div className="space-y-3">
      {msg && <Alert variant={msg.v}>{msg.t}</Alert>}
      {items.length === 0 && <Alert variant="success">Nothing needs your attention right now. ✅</Alert>}
      {items.map((it) => {
        const m = it.email_messages;
        const cls = m?.email_classifications?.[0];
        const hasDraft = (m?.email_draft_replies ?? []).length > 0;
        return (
          <div key={it.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <EmailPriorityBadge priority={it.priority} />
                  <EmailCategoryBadge category={cls?.category} />
                  {cls?.is_sensitive && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-300"><ShieldAlert className="h-3 w-3" /> sensitive — manual only</span>}
                  {it.deadline && <span className="text-xs text-muted-foreground">Deadline: {it.deadline}</span>}
                </div>
                <p className="mt-1 text-sm font-semibold">{m?.from_name ?? m?.from_address}: {m?.subject}{m?.is_demo && <span className="ml-1 rounded bg-muted px-1 text-[10px] font-normal text-muted-foreground">DEMO</span>}</p>
                <p className="text-xs text-muted-foreground">{it.reason}</p>
                {it.suggested_action && <p className="text-xs font-medium text-brand-600">→ {it.suggested_action}</p>}
                {cls?.summary && <p className="mt-1 text-xs text-muted-foreground">{cls.summary}</p>}
              </div>
              <div className="flex shrink-0 gap-1.5">
                {m && !hasDraft && (
                  <Button size="sm" variant="secondary" onClick={() => draftFor(m.id)} disabled={busy === m.id}>
                    {busy === m.id ? <Spinner size="sm" className="text-current" /> : <PenLine className="h-3.5 w-3.5" />} Draft reply
                    <span className="inline-flex items-center text-xs text-muted-foreground"><Coins className="h-3 w-3" />{EMAIL_CREDIT_COSTS.draftReply}</span>
                  </Button>
                )}
                {hasDraft && <Button asChild size="sm" variant="secondary"><a href="/dashboard/email/drafts">View draft</a></Button>}
                <Button size="sm" variant="ghost" onClick={() => resolve(it.id)} disabled={busy === it.id}><Check className="h-3.5 w-3.5" /> Done</Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Draft Replies ----------------
type Draft = {
  id: string; tone: string; draft_text: string; status: string; sent_at: string | null; created_at: string;
  email_messages: { from_name: string | null; from_address: string | null; subject: string | null; snippet: string | null } | null;
};

export function DraftReplyEditor() {
  const { confirm, dialog, setLoading, close } = useConfirm();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setListLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ v: "success" | "error"; t: string } | null>(null);

  const load = useCallback(async () => {
    setListLoading(true);
    const res = await fetch("/api/email/draft-reply", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setDrafts((json.drafts ?? []).filter((d: Draft) => d.status !== "rejected"));
    setListLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const patch = async (draftId: string, body: Record<string, unknown>) => {
    setBusy(draftId);
    await fetch("/api/email/draft-reply", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId, ...body }) });
    setBusy(null);
    setEditing(null);
    await load();
  };

  const send = async (d: Draft) => {
    setMsg(null);
    setBusy(d.id);
    try {
      let res = await fetch("/api/email/send-reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: d.id }) });
      if (res.status === 409) {
        const ok = await confirm({
          title: "Sensitive email — confirm send",
          description: "This reply touches a sensitive topic (legal / billing / security / dispute). Review it carefully before sending.",
          confirmLabel: "Send anyway", danger: true,
        });
        if (!ok) { setBusy(null); return; }
        setLoading(true);
        res = await fetch("/api/email/send-reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: d.id, confirmSensitive: true }) });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      setMsg({ v: "success", t: json.simulated ? "Demo account — send simulated successfully." : "Reply sent. ✅" });
      await load();
    } catch (e) {
      setMsg({ v: "error", t: e instanceof Error ? e.message : "Send failed" });
    } finally {
      setBusy(null);
      close();
    }
  };

  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading…</div>;

  return (
    <div className="space-y-3">
      {msg && <Alert variant={msg.v}>{msg.t}</Alert>}
      {drafts.length === 0 && (
        <Alert variant="info">No drafts yet — generate them from the Needs Attention page, or create an automation rule.</Alert>
      )}
      {drafts.map((d) => (
        <div key={d.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">Re: {d.email_messages?.subject ?? "(no subject)"} <span className="text-xs font-normal text-muted-foreground">→ {d.email_messages?.from_address}</span></div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{d.tone}</span>
              <span className={`rounded-full px-2 py-0.5 capitalize ${d.status === "sent" ? "bg-brand-100 text-brand-900" : "bg-muted"}`}>{d.status}</span>
            </div>
          </div>
          {editing === d.id ? (
            <div className="mt-2 space-y-2">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => patch(d.id, { draftText: text })} disabled={busy === d.id}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">{d.draft_text}</p>
          )}
          {d.status !== "sent" && editing !== d.id && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => send(d)} disabled={busy === d.id}>
                {busy === d.id ? <Spinner size="sm" className="text-current" /> : <Send className="h-3.5 w-3.5" />} Send
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setEditing(d.id); setText(d.draft_text); }}><PenLine className="h-3.5 w-3.5" /> Edit</Button>
              <Button size="sm" variant="secondary" onClick={() => patch(d.id, { status: "approved" })} disabled={busy === d.id}><Check className="h-3.5 w-3.5" /> Approve</Button>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => patch(d.id, { status: "rejected" })} disabled={busy === d.id}><X className="h-3.5 w-3.5" /> Reject</Button>
            </div>
          )}
        </div>
      ))}
      {dialog}
    </div>
  );
}

// ---------------- Automation Rules ----------------
type Rule = { id: string; name: string; trigger_category: string; action: string; tone: string | null; is_active: boolean; runs_count: number; last_run_at: string | null };

export function EmailAutomationRuleBuilder() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ name: "", triggerCategory: "support", action: "draft_reply", tone: "support" as DraftTone });
  const [msg, setMsg] = useState<{ v: "success" | "error"; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/email/automation-rules", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setRules(json.rules ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/email/automation-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create rule");
      setF({ ...f, name: "" });
      setMsg({ v: "success", t: "Rule created — it runs during the daily assistant job." });
      await load();
    } catch (err) {
      setMsg({ v: "error", t: err instanceof Error ? err.message : "Failed" });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, isActive: boolean) => {
    await fetch("/api/email/automation-rules", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive }) });
    await load();
  };
  const remove = async (id: string) => {
    await fetch("/api/email/automation-rules", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  };

  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading…</div>;

  return (
    <div className="space-y-4">
      <Alert variant="info">
        Rules use safe actions only (draft / alert / label / follow-up). Nothing is auto-sent, and
        sensitive categories (billing, legal, security) can never be auto-drafted.
      </Alert>
      <form onSubmit={create} className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4">
        <label className="min-w-[180px] flex-1 text-xs font-medium text-muted-foreground">Rule name
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Draft replies for support emails" required className="mt-0.5 block h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground" />
        </label>
        <label className="text-xs font-medium text-muted-foreground">When category is
          <select value={f.triggerCategory} onChange={(e) => setF({ ...f, triggerCategory: e.target.value })} className="mt-0.5 block h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
            {EMAIL_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">Action
          <select value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} className="mt-0.5 block h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
            <option value="draft_reply">Draft a reply</option>
            <option value="alert">Alert me</option>
            <option value="label">Label it</option>
            <option value="follow_up">Follow-up reminder</option>
          </select>
        </label>
        {f.action === "draft_reply" && (
          <label className="text-xs font-medium text-muted-foreground">Tone
            <select value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value as DraftTone })} className="mt-0.5 block h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
              {DRAFT_TONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
        )}
        <Button type="submit" size="sm" disabled={busy}><Plus className="h-4 w-4" /> Add rule</Button>
      </form>
      {msg && <Alert variant={msg.v}>{msg.t}</Alert>}
      <div className="space-y-2">
        {rules.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
            <div>
              <div className="text-sm font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">When <strong>{r.trigger_category.replace(/_/g, " ")}</strong> → {r.action.replace(/_/g, " ")}{r.tone ? ` (${r.tone})` : ""} · ran {r.runs_count}×</div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => toggle(r.id, !r.is_active)}>{r.is_active ? "Pause" : "Activate"}</Button>
              <button onClick={() => remove(r.id)} className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`Delete ${r.name}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No rules yet.</p>}
      </div>
    </div>
  );
}

// ---------------- Summary Reports ----------------
type Report = { id: string; report_date: string; emailed: boolean; credits_used: number; summary_json: { counts?: { total: number; needsReply: number; critical: number; drafts: number }; nextActions?: string[]; critical?: { from: string; subject: string; reason: string }[] } };

export function EmailSummaryReport() {
  const { accounts } = useEmailData();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ v: "success" | "error"; t: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/email/summary/daily", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setReports(json.reports ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    if (!accounts[0]) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/email/summary/daily", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: accounts[0].id }) });
      if (res.status === 402) throw new Error("Not enough credits.");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setMsg({ v: "success", t: `Summary generated${json.creditsUsed ? ` · ${json.creditsUsed} credits` : " · free"}` });
      await load();
    } catch (e) {
      setMsg({ v: "error", t: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">The daily summary is generated automatically each morning and emailed to you. Generate one on demand anytime.</p>
        <Button size="sm" onClick={generate} disabled={busy || accounts.length === 0}>
          {busy ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />} Generate now
          <span className="inline-flex items-center text-xs text-muted-foreground"><Coins className="h-3 w-3" />{EMAIL_CREDIT_COSTS.dailySummary}</span>
        </Button>
      </div>
      {msg && <Alert variant={msg.v}>{msg.t}</Alert>}
      {reports.length === 0 && <Alert variant="info">No reports yet — scan your inbox first, then generate a summary.</Alert>}
      {reports.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{r.report_date}</h3>
            <span className="text-xs text-muted-foreground">{r.emailed ? "📧 emailed" : "in-app"} · {r.credits_used || "free"}</span>
          </div>
          {r.summary_json.counts && (
            <p className="mt-1 text-sm text-muted-foreground">
              {r.summary_json.counts.critical} critical · {r.summary_json.counts.needsReply} need a reply · {r.summary_json.counts.drafts} drafts ready
            </p>
          )}
          {(r.summary_json.nextActions ?? []).length > 0 && (
            <ol className="mt-2 list-inside list-decimal space-y-0.5 text-sm">
              {r.summary_json.nextActions!.map((a, i) => <li key={i}>{a}</li>)}
            </ol>
          )}
        </Card>
      ))}
    </div>
  );
}

// ---------------- Settings ----------------
export function EmailNotificationSettings() {
  const { confirm, dialog, setLoading, close } = useConfirm();
  const { accounts, loading, reload } = useEmailData();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const patchAccount = async (id: string, body: Record<string, unknown>) => {
    // permission mode + toggles are owner-updatable directly (RLS-scoped route not needed for these flags)
    setBusy(id);
    await fetch("/api/email/account-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: id, ...body }) });
    setBusy(null);
    await reload();
  };

  const disconnect = async (id: string, deleteData: boolean) => {
    const ok = await confirm({
      title: deleteData ? "Disconnect & delete all email data?" : "Disconnect this account?",
      description: deleteData
        ? "Tokens are revoked and ALL stored messages, classifications, drafts and reports are permanently deleted."
        : "Stored OAuth tokens are deleted immediately. Your synced data stays until you delete it.",
      confirmLabel: deleteData ? "Delete everything" : "Disconnect", danger: true,
    });
    if (!ok) return;
    setLoading(true);
    try {
      await fetch("/api/email/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: id, deleteData }) });
      setMsg(deleteData ? "Account disconnected and all data deleted." : "Account disconnected — tokens deleted.");
      await reload();
    } finally {
      close();
    }
  };

  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading…</div>;

  return (
    <div className="space-y-4">
      {msg && <Alert variant="success">{msg}</Alert>}
      {accounts.length === 0 && <Alert variant="info">No connected accounts.</Alert>}
      {accounts.map((a) => (
        <Card key={a.id} className="space-y-3 p-4">
          <div className="text-sm font-semibold">{a.email_address} <span className="text-xs font-normal text-muted-foreground">({a.provider})</span></div>
          <label className="block text-xs font-medium text-muted-foreground">Permission mode
            <select value={a.permission_mode} onChange={(e) => patchAccount(a.id, { permissionMode: e.target.value })} disabled={busy === a.id}
              className="mt-0.5 block h-9 w-full max-w-xs rounded-md border border-border bg-background px-2 text-sm text-foreground">
              {PERMISSION_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={a.daily_summary} onChange={(e) => patchAccount(a.id, { dailySummary: e.target.checked })} className="accent-lime-600" /> Daily email summary</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={a.notify_critical} onChange={(e) => patchAccount(a.id, { notifyCritical: e.target.checked })} className="accent-lime-600" /> Notify on critical emails</label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => disconnect(a.id, false)}>Disconnect</Button>
            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => disconnect(a.id, true)}><Trash2 className="h-3.5 w-3.5" /> Disconnect & delete data</Button>
          </div>
        </Card>
      ))}
      {dialog}
    </div>
  );
}
