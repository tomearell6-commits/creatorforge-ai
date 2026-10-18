"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type Offer = { id: string; fix: string; title: string; why: string; credits: number; mode: "auto" | "paste"; severity: "critical" | "warning"; targets?: string[] };
type Result =
  | { kind: "draft_created"; title: string; editUrl: string; previewUrl: string; notes: string[]; placeholders: string[] }
  | { kind: "paste"; title: string; html?: string; code?: string; rows?: { url: string; title: string; description: string }[]; instructions: string[]; notes: string[]; placeholders: string[] };
type Stored = { status: string; result: Result | Record<string, never>; error: string | null; credits: number };
type Loaded = { offers: Offer[]; fixes: Record<string, Stored>; balance: number; wordpress: { name: string } | null; host?: string; origin?: string; needsFullAudit?: boolean };

/**
 * Connect WordPress right inside the audit. The connection is the same one Autopilot uses (one shared list),
 * so a site connected in either place is picked up automatically in the other.
 */
function ConnectWordPress({ origin, host, onConnected }: { origin: string; host: string; onConnected: () => void }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ text: string; upgrade?: boolean } | null>(null);

  async function connect() {
    setBusy(true); setErr(null);
    const r = await api<{ error?: string; code?: string }>("/api/wordpress/sites", { method: "POST", body: JSON.stringify({ siteUrl: origin, username: username.trim(), appPassword: appPassword.trim(), defaultCategory: "" }) });
    setBusy(false);
    if (!r.ok) { setErr({ text: r.data.error ?? "Could not connect. Check the username and application password.", upgrade: r.data.code === "upgrade_required" }); return; }
    setAppPassword("");
    onConnected();
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand-500/40 bg-muted/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Want Forge to fix {host} for you?</p>
          <p className="mt-1 text-xs text-muted-foreground">Connect your WordPress site once. New pages are then created on your site as <strong>drafts</strong> for you to review, instead of text you paste in yourself. This is the same connection Autopilot uses, so you never connect twice.</p>
        </div>
        {!open && <Button size="sm" onClick={() => setOpen(true)}>Connect WordPress</Button>}
      </div>
      {open && (
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>In WordPress, open <strong>Users → Profile</strong> and scroll to <strong>Application Passwords</strong>.</li>
            <li>Type the name “CreatorsForge” and click <strong>Add New Application Password</strong>.</li>
            <li>Copy the password WordPress shows you and paste it below with your WordPress username.</li>
          </ol>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="sa-wp-user" className="text-xs font-medium">WordPress username</label><input id="sa-wp-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></div>
            <div><label htmlFor="sa-wp-pass" className="text-xs font-medium">Application password</label><input id="sa-wp-pass" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} autoComplete="off" placeholder="xxxx xxxx xxxx xxxx" className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" disabled={busy || !username.trim() || !appPassword.trim()} onClick={connect}>{busy ? <><Spinner size="sm" /> Checking…</> : "Connect and continue"}</Button>
            <span className="text-xs text-muted-foreground">Stored encrypted. We never see your normal password, and you can delete the application password in WordPress any time.</span>
          </div>
          {err && <Alert variant="error">{err.text}{err.upgrade && <> <Link href="/dashboard/billing" className="font-semibold underline">See plans</Link></>}</Alert>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Not on WordPress? Nothing to connect: every fix below still comes as ready-to-paste text with instructions.</p>
    </div>
  );
}

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

function Copy({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? "Copied" : label}</Button>;
}

function ResultView({ r }: { r: Result }) {
  return (
    <div className="mt-2 space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
      {r.kind === "draft_created" ? (
        <p>Saved as a <strong>draft</strong> on your site: <a className="font-semibold text-brand-600 underline" href={r.editUrl} target="_blank" rel="noreferrer">open it to review and publish</a>. Nothing is public yet.</p>
      ) : (
        <>
          {r.html && <div className="max-h-64 overflow-y-auto rounded border border-border bg-background p-3" dangerouslySetInnerHTML={{ __html: r.html }} />}
          {r.code && <pre className="max-h-64 overflow-auto rounded border border-border bg-background p-3 text-xs">{r.code}</pre>}
          {r.rows && (
            <div className="max-h-72 overflow-auto rounded border border-border bg-background">
              <table className="w-full text-left text-xs"><thead className="text-muted-foreground"><tr><th className="p-2">Page</th><th className="p-2">Title</th><th className="p-2">Description</th></tr></thead>
                <tbody className="divide-y divide-border/60">{r.rows.map((x) => <tr key={x.url}><td className="max-w-[10rem] break-all p-2">{x.url.replace(/^https?:\/\//, "")}</td><td className="p-2">{x.title}</td><td className="p-2">{x.description}</td></tr>)}</tbody></table>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {r.html && <Copy text={r.html} label="Copy page text" />}
            {r.code && <Copy text={r.code} label="Copy code" />}
            {r.rows && <Copy text={r.rows.map((x) => `${x.url}\t${x.title}\t${x.description}`).join("\n")} label="Copy table" />}
          </div>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">{r.instructions.map((i, k) => <li key={k}>{i}</li>)}</ul>
        </>
      )}
      {r.notes.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-700">{r.notes.map((n, k) => <li key={k}>{n}</li>)}</ul>}
      {r.placeholders.length > 0 && <p className="text-xs text-muted-foreground">Fill in: {r.placeholders.join(" · ")}</p>}
    </div>
  );
}

/** "Fix it for you": itemised, priced fixes paid from the credit balance. */
export function SEOAuditFixes({ auditId }: { auditId: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [done, setDone] = useState<Record<string, Stored>>({});

  const load = useCallback(async () => {
    const r = await api<Loaded>(`/api/seo-audit/offers?id=${auditId}`);
    if (!r.ok) { setMsg({ kind: "error", text: "Could not load the fixes." }); return; }
    setData(r.data);
    setDone(r.data.fixes);
    setPicked(new Set(r.data.offers.filter((o) => r.data.fixes[o.id]?.status !== "done").map((o) => o.id)));
  }, [auditId]);
  useEffect(() => { void load(); }, [load]);

  if (!data) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" /> Working out your fixes…</div>;
  if (data.needsFullAudit) return null; // the Site structure card explains how to unlock fixes

  const pending = data.offers.filter((o) => done[o.id]?.status !== "done");
  const chosen = pending.filter((o) => picked.has(o.id));
  const total = chosen.reduce((n, o) => n + o.credits, 0);
  const short = total > data.balance;

  async function run() {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ results?: { offerId: string; status: string; credits: number; result?: Result; error?: string }[]; charged?: number; balance?: number; error?: string }>("/api/seo-audit/fix", { method: "POST", body: JSON.stringify({ auditId, offerIds: chosen.map((o) => o.id) }) });
      if (!r.ok) { setMsg({ kind: "error", text: r.data.error ?? "Could not start the fixes." }); return; }
      const next = { ...done };
      const problems: string[] = [];
      for (const x of r.data.results ?? []) {
        if (x.status === "done" && x.result) next[x.offerId] = { status: "done", result: x.result, error: null, credits: x.credits };
        else if (x.error) problems.push(x.error);
      }
      setDone(next);
      setData((d) => (d ? { ...d, balance: r.data.balance ?? d.balance } : d));
      setMsg(problems.length ? { kind: "error", text: [...new Set(problems)].join(" ") } : { kind: "success", text: `Done. ${r.data.charged ?? 0} credits used.` });
    } catch { setMsg({ kind: "error", text: "Something went wrong. Nothing was charged for a fix that did not finish." }); }
    finally { setBusy(false); }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">Fix it for you</CardTitle>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">Tick what you want fixed. Credits come from your balance, and each fix is charged only after it is done. {data.wordpress ? `Pages are created as drafts on ${data.wordpress.name}: nothing is published without you.` : "Your site isn't connected, so you get ready-to-paste text with instructions."} Nothing here invents facts about your business: unknown details are left as “[Fill in]” markers.</p>
        </div>
        <p className="text-sm">Balance: <strong>{data.balance.toLocaleString()}</strong> credits</p>
      </div>

      {data.wordpress
        ? <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs"><span className="font-semibold text-green-600">● Connected</span> to {data.wordpress.name}. Fixes are applied to it as drafts, never published without you.</p>
        : data.origin && data.host && <ConnectWordPress origin={data.origin} host={data.host} onConnected={() => { setMsg({ kind: "success", text: "WordPress connected. Your fixes below will now be created on your site as drafts." }); void load(); }} />}

      {data.offers.length === 0 && <Alert variant="success">Nothing to fix: your essential pages, footer and basic structure look complete.</Alert>}

      <ul className="space-y-3">
        {data.offers.map((o) => {
          const d = done[o.id];
          const isDone = d?.status === "done";
          return (
            <li key={o.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                  {!isDone && <input type="checkbox" className="mt-1" checked={picked.has(o.id)} onChange={(e) => setPicked((p) => { const n = new Set(p); if (e.target.checked) n.add(o.id); else n.delete(o.id); return n; })} />}
                  <span className="min-w-0">
                    <span className="text-sm font-semibold">{o.title}</span>
                    <span className="block text-xs text-muted-foreground">{o.why}</span>
                  </span>
                </label>
                <span className="flex items-center gap-2">
                  <Badge variant={o.severity === "critical" ? "warning" : "default"}>{o.mode === "auto" ? "Created as a draft" : "Ready to paste"}</Badge>
                  {isDone ? <Badge variant="success">Done</Badge> : <span className="text-sm font-semibold">{o.credits} credits</span>}
                </span>
              </div>
              {isDone && d.result && "kind" in d.result && <ResultView r={d.result as Result} />}
              {d?.status === "failed" && d.error && <p className="mt-1 text-xs text-red-600">{/no credits were charged/i.test(d.error) ? d.error : `${d.error} No credits were charged.`}</p>}
            </li>
          );
        })}
      </ul>

      {pending.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-3">
          <p className="text-sm">{chosen.length} selected · <strong>{total} credits</strong>{short ? <span className="ml-2 text-red-600">You need {total - data.balance} more.</span> : null}</p>
          <div className="flex gap-2">
            {short && <Button asChild variant="outline" size="sm"><Link href="/dashboard/credits">Top up credits</Link></Button>}
            <Button size="sm" disabled={busy || chosen.length === 0 || short} onClick={run}>{busy ? <><Spinner size="sm" /> Fixing… (up to a few minutes)</> : `Fix selected (${total} credits)`}</Button>
          </div>
        </div>
      )}
      {msg && <Alert variant={msg.kind === "success" ? "success" : "error"}>{msg.text}</Alert>}
    </Card>
  );
}
