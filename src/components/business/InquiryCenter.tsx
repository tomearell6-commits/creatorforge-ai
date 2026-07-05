"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox, Sparkles, ShieldAlert, Send, Check, X, Pencil } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

type Reply = { id: string; draft_text: string; tone: string; status: string; created_at: string };
type Inquiry = {
  id: string; source: string; customer_name: string | null; customer_email: string | null;
  subject: string; message: string; category: string | null; priority: string; status: string;
  is_sensitive: boolean; ai_summary: string | null; ai_recommendation: string | null; created_at: string;
  inquiry_replies: Reply[];
};

const PRIORITY_VARIANT: Record<string, "danger" | "warning" | "default" | "info"> = {
  critical: "danger", high: "warning", normal: "default", low: "info",
};

export function InquiryCenter() {
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [filter, setFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ customer_name: "", customer_email: "", subject: "", message: "" });
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/business/inquiries${filter ? `?status=${filter}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInquiries(d?.inquiries ?? []))
      .catch(() => setInquiries([]));
  }, [filter]);
  useEffect(load, [load]);

  async function post(url: string, body: unknown, busyKey: string) {
    setBusy(busyKey);
    setError(null);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(d.error ?? "Action failed."); return false; }
    load();
    return true;
  }

  const untriaged = (inquiries ?? []).filter((q) => !q.category && ["new", "in_progress"].includes(q.status)).length;

  if (!inquiries) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {["", "new", "in_progress", "replied", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize",
                filter === s ? "bg-brand-500/15 text-brand-600" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {untriaged > 0 && (
            <Button size="sm" variant="outline" disabled={busy === "triage"} onClick={() => post("/api/business/inquiries/triage", {}, "triage")}>
              <Sparkles className="h-3.5 w-3.5" /> {busy === "triage" ? "Analyzing…" : `AI triage ${untriaged} (5cr)`}
            </Button>
          )}
          <Button size="sm" onClick={() => setAdding(!adding)}>{adding ? "Cancel" : "Log inquiry"}</Button>
        </div>
      </div>

      {adding && (
        <Card>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await post("/api/business/inquiries", form, "add")) {
                setForm({ customer_name: "", customer_email: "", subject: "", message: "" });
                setAdding(false);
              }
            }}
          >
            <div><Label htmlFor="iq-name">Customer name</Label><Input id="iq-name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><Label htmlFor="iq-email">Customer email</Label><Input id="iq-email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label htmlFor="iq-subject">Subject</Label><Input id="iq-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
            <div className="sm:col-span-2">
              <Label htmlFor="iq-msg">Message</Label>
              <textarea id="iq-msg" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div><Button type="submit" disabled={busy === "add"}>Save inquiry</Button></div>
          </form>
        </Card>
      )}

      {inquiries.length === 0 ? (
        <EmptyState icon={Inbox} title="No inquiries yet" description="Log inquiries manually, or connect your website form (Business Settings → form key)." />
      ) : (
        <div className="space-y-3">
          {inquiries.map((q) => (
            <Card key={q.id}>
              <button type="button" className="w-full text-left" onClick={() => setOpenId(openId === q.id ? null : q.id)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{q.subject || "(no subject)"}</span>
                      {q.category && <Badge variant="outline">{q.category}</Badge>}
                      <Badge variant={PRIORITY_VARIANT[q.priority] ?? "default"}>{q.priority}</Badge>
                      {q.is_sensitive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600">
                          <ShieldAlert className="h-3 w-3" /> SENSITIVE
                        </span>
                      )}
                      <Badge variant={q.status === "replied" ? "success" : q.status === "closed" ? "default" : "info"}>{q.status.replace("_", " ")}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[q.customer_name, q.customer_email, q.source, new Date(q.created_at).toLocaleString()].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </button>

              {openId === q.id && (
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  <p className="whitespace-pre-line text-sm">{q.message}</p>
                  {q.ai_recommendation && (
                    <p className="rounded-lg bg-brand-500/10 p-2 text-xs">
                      <Sparkles className="mr-1 inline h-3 w-3 text-brand-600" />
                      <span className="font-semibold">AI recommends:</span> {q.ai_recommendation}
                    </p>
                  )}

                  {q.inquiry_replies?.map((r) => (
                    <div key={r.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Draft reply ({r.tone})</p>
                        <Badge variant={r.status === "sent" ? "success" : r.status === "approved" ? "brand" : r.status === "rejected" ? "default" : "info"}>{r.status}</Badge>
                      </div>
                      {editing?.id === r.id ? (
                        <div className="mt-2">
                          <textarea value={editing.text} onChange={(e) => setEditing({ id: r.id, text: e.target.value })} rows={5}
                            aria-label="Edit draft reply"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" onClick={async () => { if (await post("/api/business/inquiries/reply-action", { replyId: r.id, action: "edit", text: editing.text }, r.id)) setEditing(null); }}>Save edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="mt-2 whitespace-pre-line text-sm">{r.draft_text}</p>
                          {r.status !== "sent" && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {r.status === "draft" && (
                                <Button size="sm" variant="outline" onClick={() => post("/api/business/inquiries/reply-action", { replyId: r.id, action: "approve" }, r.id)}>
                                  <Check className="h-3.5 w-3.5" /> Approve
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => setEditing({ id: r.id, text: r.draft_text })}>
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => post("/api/business/inquiries/reply-action", { replyId: r.id, action: "reject" }, r.id)}>
                                <X className="h-3.5 w-3.5" /> Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try { await navigator.clipboard.writeText(r.draft_text); } catch { /* ignore */ }
                                  post("/api/business/inquiries/reply-action", { replyId: r.id, action: "mark-sent" }, r.id);
                                }}
                                title="Copies the reply — send it from your own email/channel, then we mark it replied"
                              >
                                <Send className="h-3.5 w-3.5" /> Copy & mark sent
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy === `draft-${q.id}`}
                      onClick={() => post("/api/business/inquiries/draft", { inquiryId: q.id }, `draft-${q.id}`)}>
                      <Sparkles className="h-3.5 w-3.5" /> {busy === `draft-${q.id}` ? "Drafting…" : "AI draft reply (2cr)"}
                    </Button>
                    {q.status !== "closed" && (
                      <Button size="sm" variant="ghost" onClick={() => fetch("/api/business/inquiries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: q.id, status: "closed" }) }).then(load)}>
                        Close
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Replies are never sent automatically — you approve, copy and send through your own channel.
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
