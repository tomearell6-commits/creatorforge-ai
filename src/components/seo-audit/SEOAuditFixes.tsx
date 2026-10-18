"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { SEOAuditFacts } from "./SEOAuditFacts";
import { countFacts, type BusinessFacts } from "@/lib/seo-audit/facts";

type Offer = { id: string; fix: string; title: string; why: string; credits: number; mode: "auto" | "paste"; severity: "critical" | "warning"; targets?: string[] };
type Result =
  | { kind: "draft_created"; title: string; editUrl: string; previewUrl: string; notes: string[]; placeholders: string[]; pageId?: number; state?: "draft" | "published"; liveUrl?: string }
  | { kind: "paste"; title: string; html?: string; code?: string; rows?: { url: string; title: string; description: string }[]; instructions: string[]; notes: string[]; placeholders: string[]; rewritten?: boolean };
type Stored = { status: string; result: Result | Record<string, never>; error: string | null; credits: number };
type Loaded = { offers: Offer[]; fixes: Record<string, Stored>; balance: number; wordpress: { name: string } | null; host?: string; origin?: string; needsFullAudit?: boolean; facts?: BusinessFacts; defaults?: BusinessFacts };

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

function ResultView({ r, onPublish, publishing }: { r: Result; onPublish?: () => void; publishing?: boolean }) {
  return (
    <div className="mt-2 space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
      {r.kind === "draft_created" ? (
        r.state === "published"
          ? <p><strong className="text-green-600">Published</strong> on your site{r.liveUrl ? <>: <a className="font-semibold text-brand-600 underline" href={r.liveUrl} target="_blank" rel="noreferrer">view the live page</a></> : null}. <a className="underline" href={r.editUrl} target="_blank" rel="noreferrer">Edit in WordPress</a></p>
          : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1">Saved as a <strong>draft</strong> on your site, waiting for your approval. <a className="font-semibold text-brand-600 underline" href={r.previewUrl} target="_blank" rel="noreferrer">Preview it</a> or <a className="underline" href={r.editUrl} target="_blank" rel="noreferrer">edit it</a> first. Nothing is public yet.</p>
              {onPublish && typeof r.pageId === "number" && <Button size="sm" disabled={publishing} onClick={onPublish}>{publishing ? <><Spinner size="sm" /> Publishing…</> : "Approve and publish"}</Button>}
            </div>
          )
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
  const [facts, setFacts] = useState<BusinessFacts>({});
  const [rewriting, setRewriting] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishMode, setPublishMode] = useState<"auto" | "draft">("auto");

  const load = useCallback(async () => {
    const r = await api<Loaded>(`/api/seo-audit/offers?id=${auditId}`);
    if (!r.ok) { setMsg({ kind: "error", text: "Could not load the fixes." }); return; }
    setData(r.data);
    setDone(r.data.fixes);
    setFacts(r.data.facts ?? {});
    setPicked(new Set(r.data.offers.filter((o) => r.data.fixes[o.id]?.status !== "done").map((o) => o.id)));
  }, [auditId]);
  useEffect(() => { void load(); }, [load]);

  if (!data) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" /> Working out your fixes…</div>;
  if (data.needsFullAudit) return null; // the Site structure card explains how to unlock fixes

  const pending = data.offers.filter((o) => done[o.id]?.status !== "done");
  const chosen = pending.filter((o) => picked.has(o.id));
  const total = chosen.reduce((n, o) => n + o.credits, 0);
  const short = total > data.balance;

  async function rewrite(offerId: string) {
    setRewriting(offerId); setMsg(null);
    const r = await api<{ result?: Result; error?: string }>("/api/seo-audit/rewrite", { method: "POST", body: JSON.stringify({ auditId, offerId }) });
    setRewriting(null);
    if (!r.ok || !r.data.result) { setMsg({ kind: "error", text: r.data.error ?? "Could not rewrite the page." }); return; }
    setDone((d) => ({ ...d, [offerId]: { ...d[offerId], result: r.data.result as Result } }));
    setMsg({ kind: "success", text: "Rewritten with your details. No credits were used." });
  }

  async function publishNow(offerId: string) {
    setPublishing(offerId); setMsg(null);
    const r = await api<{ result?: Result; error?: string }>("/api/seo-audit/publish", { method: "POST", body: JSON.stringify({ auditId, offerId }) });
    setPublishing(null);
    if (!r.ok || !r.data.result) { setMsg({ kind: "error", text: r.data.error ?? "Could not publish the page." }); return; }
    setDone((d) => ({ ...d, [offerId]: { ...d[offerId], result: r.data.result as Result } }));
    setMsg({ kind: "success", text: "Published on your site." });
  }

  async function run(list: Offer[]) {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ results?: { offerId: string; status: string; credits: number; result?: Result; error?: string }[]; charged?: number; balance?: number; error?: string }>("/api/seo-audit/fix", { method: "POST", body: JSON.stringify({ auditId, offerIds: list.map((o) => o.id), publish: publishMode }) });
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

      {data.host && data.offers.some((o) => o.fix !== "meta_rewrites" && done[o.id]?.status !== "done") && (
        <SEOAuditFacts host={data.host} saved={facts} defaults={data.defaults ?? {}} onSaved={setFacts} />
      )}

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
              {isDone && d.result && "kind" in d.result && <ResultView r={d.result as Result} onPublish={() => void publishNow(o.id)} publishing={publishing === o.id} />}
              {isDone && o.fix === "create_page" && d.result && "kind" in d.result && d.result.kind === "paste" && !d.result.rewritten && countFacts(facts) > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <Button size="sm" variant="outline" disabled={rewriting !== null} onClick={() => void rewrite(o.id)}>{rewriting === o.id ? <><Spinner size="sm" /> Rewriting…</> : "Rewrite with my saved details (free, once)"}</Button>
                  <span>Replaces this text with a version that uses your real details instead of [Fill in] markers.</span>
                </div>
              )}
              {d?.status === "failed" && d.error && <p className="mt-1 text-xs text-red-600">{/no credits were charged/i.test(d.error) ? d.error : `${d.error} No credits were charged.`}</p>}
            </li>
          );
        })}
      </ul>

      {chosen.some((o) => o.fix === "create_page") && countFacts(facts) === 0 && (
        <Alert variant="warning">Tip: save your business details above first. Without them these pages will contain “[Fill in]” markers for you to complete by hand.</Alert>
      )}

      {data.wordpress && pending.some((o) => o.fix === "create_page") && (
        <fieldset className="space-y-2 rounded-xl border border-border p-3">
          <legend className="px-1 text-xs font-semibold">When Forge creates a page on {data.wordpress.name}</legend>
          {([["auto", "Publish it automatically", "The page goes live as soon as it is written. Legal pages, and pages that still have a [Fill in] marker, are always saved as drafts for you instead."], ["draft", "Save it as a draft for my approval", "Nothing goes live until you press “Approve and publish” on it."]] as const).map(([v, label, hint]) => (
            <label key={v} className="flex cursor-pointer items-start gap-2 text-sm">
              <input type="radio" name="publish-mode" className="mt-1" checked={publishMode === v} onChange={() => setPublishMode(v)} />
              <span><span className="font-medium">{label}</span><span className="block text-xs text-muted-foreground">{hint}</span></span>
            </label>
          ))}
        </fieldset>
      )}

      {pending.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-3">
          <p className="text-sm">{chosen.length} selected · <strong>{total} credits</strong>{short ? <span className="ml-2 text-red-600">You need {total - data.balance} more.</span> : null}</p>
          <div className="flex flex-wrap gap-2">
            {short && <Button asChild variant="outline" size="sm"><Link href="/dashboard/credits">Top up credits</Link></Button>}
            {chosen.length < pending.length && (
              <Button size="sm" variant="outline" disabled={busy || chosen.length === 0 || short} onClick={() => void run(chosen)}>{busy ? <Spinner size="sm" /> : null} Fix selected ({total} credits)</Button>
            )}
            <Button size="sm" disabled={busy || (chosen.length < pending.length ? pending.reduce((n, o) => n + o.credits, 0) > data.balance : short)} onClick={() => void run(pending)}>
              {busy ? <><Spinner size="sm" /> Fixing… (up to a few minutes)</> : `Fix everything (${pending.reduce((n, o) => n + o.credits, 0)} credits)`}
            </Button>
          </div>
        </div>
      )}
      {msg && <Alert variant={msg.kind === "success" ? "success" : "error"}>{msg.text}</Alert>}
    </Card>
  );
}
