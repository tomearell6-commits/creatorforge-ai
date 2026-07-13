"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Wand2, Copy, Check, AlertTriangle, Plus, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { LB_REVIEW_TONES } from "@/config/localBusiness";

type Loc = { id: string; business_name: string };
type Review = { id: string; reviewer_name: string | null; rating: number | null; comment: string | null; answered: boolean };

export function ReviewReplyEditor() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [locId, setLocId] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<"all" | "unanswered" | "low">("all");
  const [tone, setTone] = useState<string>("professional");
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { text: string; notice: string | null; needsHuman: boolean }>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [add, setAdd] = useState({ name: "", rating: "5", comment: "" });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/local-business/locations").then((r) => r.json()).then((j) => { setLocs(j.locations ?? []); if (j.locations?.[0]) setLocId(j.locations[0].id); });
  }, []);
  const loadReviews = useCallback((id: string) => {
    if (!id) return;
    fetch(`/api/local-business/reviews?locationId=${id}`).then((r) => r.json()).then((j) => setReviews(j.reviews ?? []));
  }, []);
  useEffect(() => { loadReviews(locId); }, [locId, loadReviews]);

  async function addReview() {
    if (!locId || !add.comment.trim()) { setMsg("Add the review text."); return; }
    setBusy("add");
    try {
      await fetch("/api/local-business/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locationId: locId, reviewerName: add.name || "Customer", rating: Number(add.rating), comment: add.comment }) });
      setAdd({ name: "", rating: "5", comment: "" }); loadReviews(locId);
    } finally { setBusy(null); }
  }

  async function draft(r: Review) {
    setBusy(r.id); setMsg(null);
    try {
      const res = await fetch("/api/local-business/reviews/draft-response", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId: r.id, tone }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) { setMsg("Out of credits — top up in the Credit Wallet."); return; }
      if (!res.ok) { setMsg(j.error || "Draft failed."); return; }
      setDrafts((d) => ({ ...d, [r.id]: { text: j.draft, notice: j.notice, needsHuman: j.needsHuman } }));
    } finally { setBusy(null); }
  }

  const shown = reviews.filter((r) => filter === "all" || (filter === "unanswered" && !r.answered) || (filter === "low" && (r.rating ?? 5) <= 3));

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="lb-rev-loc" className="text-sm font-medium">Location</label>
            <select id="lb-rev-loc" value={locId} onChange={(e) => setLocId(e.target.value)} className="mt-1 block h-10 rounded-lg border border-border bg-background px-3 text-sm">
              {locs.length === 0 && <option value="">No locations</option>}
              {locs.map((l) => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            {(["all", "unanswered", "low"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-lg border px-2.5 py-1.5 text-xs capitalize ${filter === f ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20" : "border-border"}`}>{f === "low" ? "≤3★" : f}</button>)}
          </div>
          <select value={tone} onChange={(e) => setTone(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm capitalize">
            {LB_REVIEW_TONES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
          <Input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} placeholder="Reviewer (optional)" className="max-w-[160px]" />
          <select value={add.rating} onChange={(e) => setAdd({ ...add, rating: e.target.value })} className="h-10 rounded-lg border border-border bg-background px-2 text-sm">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}★</option>)}</select>
          <Input value={add.comment} onChange={(e) => setAdd({ ...add, comment: e.target.value })} placeholder="Paste a review to draft a reply" className="min-w-[200px] flex-1" />
          <Button variant="outline" size="sm" onClick={addReview} disabled={busy === "add"}>{busy === "add" ? <Spinner className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} Add</Button>
        </div>
        {msg && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{msg}</p>}
      </Card>

      {shown.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground"><MessageSquare className="mx-auto mb-2 h-6 w-6" /> No reviews here yet. Paste one above to draft a reply. Live Google review sync activates once API access is approved.</Card>
      ) : shown.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{r.reviewer_name || "Customer"}</span>
            <span className="inline-flex items-center text-amber-500">{Array.from({ length: r.rating ?? 0 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}</span>
            {r.answered && <Badge variant="success">answered</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => draft(r)} disabled={busy === r.id}>{busy === r.id ? <Spinner className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />} Draft reply (~2 cr)</Button>
          {drafts[r.id] && (
            <div className="mt-3 rounded-lg border border-border p-3">
              {drafts[r.id].notice && <div className="mb-2 flex gap-2 rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />{drafts[r.id].notice}</div>}
              <p className="text-sm">{drafts[r.id].text}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(drafts[r.id].text); setCopied(r.id); setTimeout(() => setCopied(null), 1500); }}>{copied === r.id ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />} Copy</Button>
                {drafts[r.id].needsHuman && <Badge variant="warning">Approve manually before posting</Badge>}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
