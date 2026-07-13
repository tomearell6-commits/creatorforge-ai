"use client";

import { useEffect, useState, useCallback } from "react";
import { Inbox, Plus, Wand2, Copy, Check, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { SOCIAL_CREDIT_COSTS } from "@/config/socialContentCapabilities";

type Item = { id: string; provider: string; item_type: string; author: string | null; text: string | null; classification: string; status: string };
const CLASS_VARIANT: Record<string, "danger" | "warning" | "info" | "success" | "default"> = { urgent: "danger", complaint: "danger", sales_lead: "success", partnership: "info", customer_support: "warning", spam: "default", general_question: "default" };
const TONES = ["professional", "warm", "appreciative", "apologetic", "direct"];

export function SocialInbox() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("all");
  const [tone, setTone] = useState("professional");
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { text: string; notice: string | null; needsHuman: boolean }>>({});
  const [add, setAdd] = useState({ author: "", text: "" });
  const [copied, setCopied] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => { fetch("/api/social-business/inbox").then((r) => r.json()).then((j) => setItems(j.items ?? [])); }, []);
  useEffect(() => { load(); }, [load]);

  async function addItem() {
    if (!add.text.trim()) { setMsg("Paste a message to classify."); return; }
    setBusy("add");
    try { await fetch("/api/social-business/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ author: add.author || "Customer", text: add.text }) }); setAdd({ author: "", text: "" }); load(); }
    finally { setBusy(null); }
  }
  async function draft(it: Item) {
    setBusy(it.id); setMsg(null);
    try {
      const res = await fetch("/api/social-business/replies/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inboxItemId: it.id, tone }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg("Out of credits — top up in the Credit Wallet."); return; }
      if (!res.ok) { setMsg(j.error || "Draft failed."); return; }
      setDrafts((d) => ({ ...d, [it.id]: { text: j.draft, notice: j.notice, needsHuman: j.needsHuman } }));
    } finally { setBusy(null); }
  }

  const classes = Array.from(new Set(items.map((i) => i.classification)));
  const shown = items.filter((i) => filter === "all" || i.classification === filter);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm"><option value="all">All</option>{classes.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}</select>
          <select value={tone} onChange={(e) => setTone(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm capitalize">{TONES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Live inbox retrieval activates per platform once its API is approved. Paste a message below to classify it and draft a reply now.</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Input value={add.author} onChange={(e) => setAdd({ ...add, author: e.target.value })} placeholder="From (optional)" className="max-w-[160px]" />
          <Input value={add.text} onChange={(e) => setAdd({ ...add, text: e.target.value })} placeholder="Message / comment / enquiry" className="min-w-[200px] flex-1" />
          <Button variant="outline" size="sm" onClick={addItem} disabled={busy === "add"}>{busy === "add" ? <Spinner className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} Add</Button>
        </div>
        {msg && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{msg}</p>}
      </Card>

      {shown.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground"><Inbox className="mx-auto mb-2 h-6 w-6" /> No enquiries yet.</Card>
      ) : shown.map((it) => (
        <Card key={it.id} className="p-4">
          <div className="flex items-center gap-2"><span className="text-sm font-medium">{it.author || "Customer"}</span><Badge variant="default">{it.provider}</Badge><Badge variant={CLASS_VARIANT[it.classification] ?? "default"}>{it.classification.replace(/_/g, " ")}</Badge></div>
          <p className="mt-1 text-sm text-muted-foreground">{it.text}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => draft(it)} disabled={busy === it.id}>{busy === it.id ? <Spinner className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />} Draft reply (~{SOCIAL_CREDIT_COSTS.reply_draft} cr)</Button>
          {drafts[it.id] && (
            <div className="mt-3 rounded-lg border border-border p-3">
              {drafts[it.id].notice && <div className="mb-2 flex gap-2 rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />{drafts[it.id].notice}</div>}
              <p className="text-sm">{drafts[it.id].text}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(drafts[it.id].text); setCopied(it.id); setTimeout(() => setCopied(null), 1500); }}>{copied === it.id ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />} Copy</Button>
                {drafts[it.id].needsHuman && <Badge variant="warning">Approve manually before sending</Badge>}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
