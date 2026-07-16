"use client";

import { useEffect, useState } from "react";
import { Wand2, Image as ImageIcon, CalendarClock, Send, Copy, Check, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { LB_POST_TYPES, lbPostTypeLabel, LB_CREDIT_COSTS, type LbPostType } from "@/config/localBusiness";

type Loc = { id: string; business_name: string };
type Out = { mainText: string; shortText: string; cta: string; imagePrompt: string; imageDescription: string; suggestedTime: string; socialVariations: string[]; complianceWarning?: string };

export function BusinessPostGenerator() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [form, setForm] = useState({ locationId: "", postType: "business_update" as LbPostType, topic: "", offer: "", cta: "", tone: "professional", withImage: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [out, setOut] = useState<Out | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [schedAt, setSchedAt] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/local-business/locations").then((r) => r.json()).then((j) => { setLocs(j.locations ?? []); if (j.locations?.[0]) setForm((f) => ({ ...f, locationId: j.locations[0].id })); });
  }, []);

  async function generate() {
    if (!form.locationId) { setMsg({ kind: "error", text: "Select a business location." }); return; }
    setBusy("generate"); setMsg(null); setOut(null); setImageUrl(null); setPostId(null);
    try {
      const res = await fetch("/api/local-business/posts/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg({ kind: "error", text: "Out of credits — top up in the Credit Wallet." }); return; }
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Generation failed." }); return; }
      setOut(j.post); setPostId(j.postId); setMsg({ kind: "success", text: `Post ready (${j.charged} credits).` });
    } finally { setBusy(null); }
  }

  async function genImage() {
    if (!out || !postId) return;
    setBusy("image"); setMsg(null);
    try {
      const res = await fetch("/api/local-business/images/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: out.imagePrompt, postId }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg({ kind: "error", text: "Out of credits for the image." }); return; }
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Image failed." }); return; }
      setImageUrl(j.url);
    } finally { setBusy(null); }
  }

  async function schedule() {
    if (!postId || !schedAt) { setMsg({ kind: "error", text: "Pick a date & time." }); return; }
    setBusy("schedule");
    try {
      const res = await fetch("/api/local-business/posts/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, publishAt: new Date(schedAt).toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }) });
      const j = await res.json().catch(() => ({}));
      setMsg(res.ok ? { kind: "success", text: "Scheduled — see the Content Calendar." } : { kind: "error", text: j.error || "Schedule failed." });
    } finally { setBusy(null); }
  }

  async function publish() {
    if (!postId) return;
    setBusy("publish");
    try {
      const res = await fetch("/api/local-business/posts/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId }) });
      const j = await res.json().catch(() => ({}));
      setMsg({ kind: j.published ? "success" : "error", text: j.message || (j.published ? "Published." : "Saved as draft.") });
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="lb-post-loc" className="text-sm font-medium">Business location</label>
            <select id="lb-post-loc" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              {locs.length === 0 && <option value="">No locations yet</option>}
              {locs.map((l) => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="lb-post-type" className="text-sm font-medium">Post type</label>
            <select id="lb-post-type" value={form.postType} onChange={(e) => setForm({ ...form, postType: e.target.value as LbPostType })} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              {LB_POST_TYPES.map((t) => <option key={t} value={t}>{lbPostTypeLabel(t)}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Topic (e.g. weekend sale)" />
          <Input value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} placeholder="Offer (optional)" />
          <Input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="Call to action (optional)" />
          <select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            {["professional", "warm", "excited", "informative", "friendly"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Button className="mt-3" onClick={generate} disabled={busy === "generate"}>{busy === "generate" ? <><Spinner className="h-4 w-4" /> Generating…</> : <><Wand2 className="h-4 w-4" /> Generate post (~{LB_CREDIT_COSTS.post} cr)</>}</Button>
        {msg && <p className={`mt-2 rounded-lg px-3 py-2 text-sm ${msg.kind === "success" ? "border-l-4 border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>{msg.text}</p>}
      </Card>

      {out && (
        <Card className="p-5">
          {out.complianceWarning && <div className="mb-3 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />{out.complianceWarning}</div>}
          <p className="text-xs font-semibold text-muted-foreground">Post text</p>
          <textarea value={out.mainText} onChange={(e) => setOut({ ...out, mainText: e.target.value })} rows={5} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="default">CTA: {out.cta}</Badge>
            <span>{out.suggestedTime}</span>
          </div>
          {imageUrl && <img src={imageUrl} alt={out.imageDescription} className="mt-3 max-h-64 rounded-lg border border-border" />}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={genImage} disabled={busy === "image"}>{busy === "image" ? <Spinner className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />} {imageUrl ? "Regenerate image" : "Generate image (~5 cr)"}</Button>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(out.mainText); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />} Copy</Button>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
            <div><label htmlFor="lb-sched" className="text-xs text-muted-foreground">Schedule</label><Input id="lb-sched" type="datetime-local" value={schedAt} onChange={(e) => setSchedAt(e.target.value)} /></div>
            <Button variant="secondary" size="sm" onClick={schedule} disabled={busy === "schedule"}><CalendarClock className="h-3.5 w-3.5" /> Schedule</Button>
            <Button size="sm" onClick={publish} disabled={busy === "publish"} className="ml-auto"><Send className="h-3.5 w-3.5" /> Publish</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Live publishing to Google activates once Business Profile API access is approved. Until then, scheduling and manual copy work today.</p>
        </Card>
      )}
    </div>
  );
}
