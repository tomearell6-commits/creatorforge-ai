"use client";

/**
 * Compact operations panels: Database & Storage, Webhooks, Service Health,
 * Alerts, Checklist, Calendar, Cost Forecast. Grouped in one module — each is
 * a small self-contained panel over its API route.
 */
import { useMemo, useState } from "react";
import { ExternalLink, RefreshCw, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { OpsBadge, OpsProgress, OpsLoading, useOps, fmtDate, fmtDateTime, fmtMoney, fmtNum } from "./ui";
import { OPS_PROVIDERS, OPS_CATEGORIES } from "@/lib/operations/registry";

// ---------- Database & Storage ----------
type StorageData = {
  counts: Record<string, number>;
  capacity: { id: string; provider_id: string; quota_type: string; monthly_limit: number | null; current_usage: number }[];
  dashboards: Record<string, string>;
};

export function OpsStorage() {
  const { data, loading, error } = useOps<StorageData>("/api/admin/operations/storage");
  if (loading) return <OpsLoading />;
  if (error || !data) return <Alert variant="error">{error ?? "Failed to load"}</Alert>;

  const LABELS: Record<string, string> = {
    users: "Users", projects: "Projects", assets: "Media assets", designAssets: "Design assets",
    renderJobs: "Render jobs", designExports: "Design exports", leads: "Leads", seoArticles: "SEO articles",
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(data.counts).map(([k, v]) => (
          <Card key={k} className="p-4"><div className="text-2xl font-bold">{fmtNum(v)}</div><div className="text-xs text-muted-foreground">{LABELS[k] ?? k}</div></Card>
        ))}
      </div>
      <Card className="p-4">
        <h3 className="text-sm font-semibold">Capacity (maintained via Usage Quotas)</h3>
        {data.capacity.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Set GB limits/usage for supabase-db and supabase-storage on the Usage Quotas page to see capacity bars here.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {data.capacity.map((c) => {
              const pct = c.monthly_limit ? Math.round((Number(c.current_usage) / Number(c.monthly_limit)) * 100) : null;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <span>{c.provider_id} — {fmtNum(c.current_usage)} / {fmtNum(c.monthly_limit)} GB</span>
                  <OpsProgress pct={pct} />
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(data.dashboards).map(([label, url]) => (
            <Button key={label} asChild size="sm" variant="secondary">
              <a href={url} target="_blank" rel="noopener"><ExternalLink className="h-3.5 w-3.5" /> Supabase {label}</a>
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Supabase doesn&apos;t expose DB size/backup status via API — check the linked dashboards during the monthly review and record values in Usage Quotas.
        </p>
      </Card>
    </div>
  );
}

// ---------- Webhooks ----------
type Webhook = { provider_id: string; name: string; webhook_path: string | null; last_success_at: string | null; last_failure_at: string | null; failure_count: number; computedStatus: string };

export function OpsWebhooks() {
  const { data, loading, error, reload } = useOps<{ webhooks: Webhook[] }>("/api/admin/operations/webhooks");
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (providerId: string, action: string) => {
    setBusy(providerId);
    try {
      await fetch("/api/admin/operations/webhooks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId, action }) });
      await reload();
    } finally { setBusy(null); }
  };
  if (loading) return <OpsLoading />;
  if (error || !data) return <Alert variant="error">{error ?? "Failed to load"}</Alert>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Provider</th><th className="px-3 py-2 font-medium">Endpoint</th>
            <th className="px-3 py-2 font-medium">Last success</th><th className="px-3 py-2 font-medium">Last failure</th>
            <th className="px-3 py-2 font-medium">Failures</th><th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {data.webhooks.map((w) => (
            <tr key={w.provider_id} className="border-b border-border last:border-0">
              <td className="px-3 py-2.5 font-medium">{w.name}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{w.webhook_path ?? "—"}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{fmtDateTime(w.last_success_at)}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{fmtDateTime(w.last_failure_at)}</td>
              <td className="px-3 py-2.5">{w.failure_count}</td>
              <td className="px-3 py-2.5"><OpsBadge status={w.computedStatus} /></td>
              <td className="px-3 py-2.5 text-right">
                <Button size="sm" variant="ghost" onClick={() => act(w.provider_id, "reset_failures")} disabled={busy === w.provider_id}>Reset failures</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Service Health (provider records, editable) ----------
type Provider = {
  provider_id: string; name: string; category: string; account_email: string | null; current_plan: string | null;
  monthly_cost: number; renewal_date: string | null; health_status: string; admin_notes: string | null;
  login_url: string | null; configured: boolean | null; renewalStatus: string; daysToRenewal: number | null;
};

export function OpsHealth() {
  const { data, loading, error, reload } = useOps<{ providers: Provider[] }>("/api/admin/operations/providers");
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ accountEmail: "", currentPlan: "", monthlyCost: "", renewalDate: "", adminNotes: "" });
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => (data?.providers ?? []).filter((p) =>
    (cat === "all" || p.category === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase()))
  ), [data, cat, q]);

  const save = async (providerId: string) => {
    setBusy(true);
    try {
      await fetch("/api/admin/operations/providers", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId, accountEmail: form.accountEmail, currentPlan: form.currentPlan,
          monthlyCost: form.monthlyCost === "" ? 0 : Number(form.monthlyCost),
          renewalDate: form.renewalDate || null, adminNotes: form.adminNotes,
        }),
      });
      setEditing(null);
      await reload();
    } finally { setBusy(false); }
  };

  if (loading) return <OpsLoading />;
  if (error || !data) return <Alert variant="error">{error ?? "Failed to load"}</Alert>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search providers…" aria-label="Search providers" className="h-9 w-52 rounded-lg border border-border bg-background px-3 text-sm" />
        <button onClick={() => setCat("all")} className={`rounded-full px-3 py-1 text-xs ${cat === "all" ? "bg-brand-100 text-brand-900 dark:bg-brand-950/40" : "text-muted-foreground hover:bg-muted"}`}>All</button>
        {OPS_CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={`rounded-full px-3 py-1 text-xs ${cat === c.id ? "bg-brand-100 text-brand-900 dark:bg-brand-950/40" : "text-muted-foreground hover:bg-muted"}`}>{c.label}</button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((p) => (
          <div key={p.provider_id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.current_plan ?? "Plan not set"} · {fmtMoney(p.monthly_cost)}/mo · renews {fmtDate(p.renewal_date)}
                  {p.account_email ? ` · ${p.account_email}` : ""}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <OpsBadge status={p.configured === false ? "not_configured" : p.configured ? "healthy" : "unknown"} />
                {p.daysToRenewal != null && p.daysToRenewal <= 30 && <OpsBadge status={p.renewalStatus} />}
              </div>
            </div>
            {p.admin_notes && <p className="mt-1 text-xs text-muted-foreground">📝 {p.admin_notes}</p>}
            {editing === p.provider_id ? (
              <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.accountEmail} onChange={(e) => setForm({ ...form, accountEmail: e.target.value })} placeholder="Account email" className="h-8 rounded border border-border bg-background px-2 text-sm" />
                  <input value={form.currentPlan} onChange={(e) => setForm({ ...form, currentPlan: e.target.value })} placeholder="Plan" className="h-8 rounded border border-border bg-background px-2 text-sm" />
                  <input value={form.monthlyCost} onChange={(e) => setForm({ ...form, monthlyCost: e.target.value })} placeholder="$/month" className="h-8 rounded border border-border bg-background px-2 text-sm" />
                  <input type="date" value={form.renewalDate} onChange={(e) => setForm({ ...form, renewalDate: e.target.value })} className="h-8 rounded border border-border bg-background px-2 text-sm" />
                </div>
                <input value={form.adminNotes} onChange={(e) => setForm({ ...form, adminNotes: e.target.value })} placeholder="Admin notes" className="h-8 w-full rounded border border-border bg-background px-2 text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save(p.provider_id)} disabled={busy}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setEditing(p.provider_id); setForm({ accountEmail: p.account_email ?? "", currentPlan: p.current_plan ?? "", monthlyCost: p.monthly_cost?.toString() ?? "", renewalDate: p.renewal_date ?? "", adminNotes: p.admin_notes ?? "" }); }}>Edit</Button>
                {p.login_url && <Button asChild size="sm" variant="ghost"><a href={p.login_url} target="_blank" rel="noopener"><ExternalLink className="h-3.5 w-3.5" /> Dashboard</a></Button>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Alerts ----------
type OpsAlertRow = { id: string; alert_type: string; severity: string; provider_id: string | null; message: string; recommended_action: string | null; created_at: string; resolved_by?: string | null; admin_notes?: string | null };

export function OpsAlerts() {
  const { data, loading, error, reload } = useOps<{ open: OpsAlertRow[]; resolved: OpsAlertRow[] }>("/api/admin/operations/alerts?refresh=1");
  const { confirm, dialog, setLoading, close } = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  const resolve = async (a: OpsAlertRow) => {
    let confirmFlag = false;
    if (a.severity === "critical") {
      const ok = await confirm({ title: "Resolve critical alert?", description: <>{a.message}<br />Only resolve after the underlying issue is actually fixed.</>, confirmLabel: "Resolve", danger: true });
      if (!ok) return;
      confirmFlag = true;
      setLoading(true);
    }
    setBusy(a.id);
    try {
      await fetch("/api/admin/operations/mark-resolved", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: a.id, confirm: confirmFlag }),
      });
      await reload();
    } finally { setBusy(null); close(); }
  };

  if (loading) return <OpsLoading label="Evaluating alert rules…" />;
  if (error || !data) return <Alert variant="error">{error ?? "Failed to load"}</Alert>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.open.length} open alert(s) — rules re-evaluated on load and daily by cron.</p>
        <Button size="sm" variant="secondary" onClick={reload}><RefreshCw className="h-4 w-4" /> Re-evaluate</Button>
      </div>
      {data.open.length === 0 && <Alert variant="success">No open alerts — everything is healthy. ✅</Alert>}
      <div className="space-y-2">
        {data.open.map((a) => (
          <div key={a.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><OpsBadge status={a.severity === "critical" ? "critical" : a.severity === "warning" ? "attention" : "healthy"} /><span className="text-xs uppercase text-muted-foreground">{a.alert_type.replace(/_/g, " ")}</span></div>
              <p className="mt-1 text-sm font-medium">{a.message}</p>
              {a.recommended_action && <p className="text-xs text-muted-foreground">→ {a.recommended_action}</p>}
              <p className="text-[11px] text-muted-foreground">{fmtDateTime(a.created_at)}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => resolve(a)} disabled={busy === a.id}><Check className="h-3.5 w-3.5" /> Resolve</Button>
          </div>
        ))}
      </div>
      {data.resolved.length > 0 && (
        <details className="rounded-xl border border-border bg-card p-3">
          <summary className="cursor-pointer text-sm font-semibold">Recently resolved ({data.resolved.length})</summary>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {data.resolved.map((a) => <li key={a.id}>✓ {a.message} <span className="text-[11px]">by {a.resolved_by ?? "—"}</span></li>)}
          </ul>
        </details>
      )}
      {dialog}
    </div>
  );
}

// ---------- Monthly Checklist ----------
type ChecklistData = {
  checklist: { id: string; month: string; status: string };
  items: { id: string; label: string; completed: boolean; completed_by: string | null; completed_at: string | null; notes: string | null }[];
  history: { month: string; status: string }[];
};

export function OpsChecklist() {
  const { data, loading, error, reload } = useOps<ChecklistData>("/api/admin/operations/checklist");
  const [busy, setBusy] = useState<string | null>(null);
  const toggle = async (id: string, completed: boolean) => {
    setBusy(id);
    try {
      await fetch("/api/admin/operations/checklist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: id, completed }) });
      await reload();
    } finally { setBusy(null); }
  };
  if (loading) return <OpsLoading />;
  if (error || !data) return <Alert variant="error">{error ?? "Failed to load"}</Alert>;
  const done = data.items.filter((i) => i.completed).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Review for <strong>{data.checklist.month}</strong> — {done}/{data.items.length} complete</p>
        <OpsBadge status={data.checklist.status === "completed" ? "healthy" : "attention"} />
      </div>
      <OpsProgress pct={data.items.length ? Math.round((done / data.items.length) * 100) : 0} />
      <ul className="space-y-1.5">
        {data.items.map((it) => (
          <li key={it.id} className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2">
            <input type="checkbox" checked={it.completed} disabled={busy === it.id} onChange={(e) => toggle(it.id, e.target.checked)} className="mt-1 h-4 w-4 accent-lime-600" aria-label={it.label} />
            <div className="min-w-0 flex-1">
              <span className={`text-sm ${it.completed ? "text-muted-foreground line-through" : ""}`}>{it.label}</span>
              {it.completed && <span className="block text-[11px] text-muted-foreground">by {it.completed_by} · {fmtDateTime(it.completed_at)}</span>}
            </div>
          </li>
        ))}
      </ul>
      {data.history.length > 1 && (
        <p className="text-xs text-muted-foreground">History: {data.history.map((h) => `${h.month} ${h.status === "completed" ? "✓" : "…"}`).join(" · ")}</p>
      )}
    </div>
  );
}

// ---------- Renewal Calendar ----------
type CalKeys = { keys: { provider_id: string; rotationDue: string | null }[] };
type CalProviders = { providers: Provider[] };

export function OpsCalendar() {
  const prov = useOps<CalProviders>("/api/admin/operations/providers");
  const keys = useOps<CalKeys>("/api/admin/operations/api-keys");
  const [offset, setOffset] = useState(0);
  const [cat, setCat] = useState<string>("all");
  const [criticalOnly, setCriticalOnly] = useState(false);

  const monthStart = useMemo(() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return d; }, [offset]);
  const events = useMemo(() => {
    const out: Record<string, { label: string; kind: string; critical: boolean }[]> = {};
    for (const p of prov.data?.providers ?? []) {
      if (!p.renewal_date) continue;
      if (cat !== "all" && p.category !== cat) continue;
      const critical = (p.daysToRenewal ?? 99) <= 7;
      if (criticalOnly && !critical) continue;
      (out[p.renewal_date] = out[p.renewal_date] ?? []).push({ label: `${p.name} renewal`, kind: "renewal", critical });
    }
    for (const k of keys.data?.keys ?? []) {
      if (!k.rotationDue) continue;
      if (criticalOnly) continue;
      (out[k.rotationDue] = out[k.rotationDue] ?? []).push({ label: `${k.provider_id} key rotation`, kind: "rotation", critical: false });
    }
    // Monthly review on the 1st.
    const first = new Date(monthStart); const firstKey = first.toISOString().slice(0, 10);
    (out[firstKey] = out[firstKey] ?? []).push({ label: "Monthly operations review", kind: "review", critical: false });
    return out;
  }, [prov.data, keys.data, cat, criticalOnly, monthStart]);

  if (prov.loading || keys.loading) return <OpsLoading />;

  const year = monthStart.getFullYear(); const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOffset(offset - 1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-semibold">{monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <Button size="sm" variant="ghost" onClick={() => setOffset(offset + 1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs" aria-label="Filter category">
            <option value="all">All categories</option>
            {OPS_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={criticalOnly} onChange={(e) => setCriticalOnly(e.target.checked)} className="accent-lime-600" /> Critical only
          </label>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const key = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
          const evts = day ? events[key] ?? [] : [];
          return (
            <div key={i} className={`min-h-[72px] rounded-lg border p-1 text-left ${day ? "border-border bg-card" : "border-transparent"}`}>
              {day && <div className="text-[11px] text-muted-foreground">{day}</div>}
              {evts.map((e, j) => (
                <div key={j} className={`mt-0.5 truncate rounded px-1 py-0.5 text-[10px] ${e.critical ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : e.kind === "rotation" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-brand-100 text-brand-900 dark:bg-brand-950/40 dark:text-brand-300"}`} title={e.label}>
                  {e.label}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Cost Forecast ----------
type CostData = {
  month: string; currentCost: number; forecastedCost: number;
  byProvider: Record<string, number>; byCategory: Record<string, number>;
  metrics: Record<string, number | null>; topDrivers: [string, number][];
  history: { month: string; current_cost: number; forecasted_cost: number }[];
};

export function OpsCostForecast() {
  const { data, loading, error } = useOps<CostData>("/api/admin/operations/cost-forecast");
  if (loading) return <OpsLoading />;
  if (error || !data) return <Alert variant="error">{error ?? "Failed to load"}</Alert>;
  const max = Math.max(1, ...Object.values(data.byProvider));
  const METRIC_LABELS: Record<string, string> = {
    activeUsers: "Active users", costPerUser: "Cost / user", costPerVideo: "Cost / video",
    costPerArticle: "Cost / SEO article", costPerLeadCampaign: "Cost / lead campaign", costPerDesign: "Cost / design",
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><div className="text-2xl font-bold">{fmtMoney(data.currentCost)}</div><div className="text-xs text-muted-foreground">Tracked monthly cost</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">{fmtMoney(data.forecastedCost)}</div><div className="text-xs text-muted-foreground">Forecast next month</div></Card>
        {Object.entries(data.metrics).filter(([k]) => k !== "activeUsers").slice(0, 2).map(([k, v]) => (
          <Card key={k} className="p-4"><div className="text-2xl font-bold">{v == null ? "—" : fmtMoney(v)}</div><div className="text-xs text-muted-foreground">{METRIC_LABELS[k] ?? k}</div></Card>
        ))}
      </div>
      <Card className="p-4">
        <h3 className="text-sm font-semibold">Cost by provider</h3>
        {Object.keys(data.byProvider).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Set each provider&apos;s monthly cost on the Service Health page to build the forecast.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {Object.entries(data.byProvider).sort((a, b) => b[1] - a[1]).map(([name, cost]) => (
              <li key={name} className="flex items-center gap-3 text-sm">
                <span className="w-48 truncate">{name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-brand-600" style={{ width: `${(cost / max) * 100}%` }} /></div>
                <span className="w-20 text-right text-xs text-muted-foreground">{fmtMoney(cost)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-semibold">Unit economics</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(data.metrics).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span className="text-muted-foreground">{METRIC_LABELS[k] ?? k}</span><span>{k === "activeUsers" ? fmtNum(v) : v == null ? "—" : fmtMoney(v)}</span></li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold">History</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {data.history.map((h) => (
              <li key={h.month} className="flex justify-between"><span className="text-muted-foreground">{h.month}</span><span>{fmtMoney(h.current_cost)} → {fmtMoney(h.forecasted_cost)}</span></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
