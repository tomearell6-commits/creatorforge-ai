"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from "@/lib/constants";
import type { SupportMessage, SupportTicket } from "@/lib/types";

export function SupportCenter() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [category, setCategory] = useState<string>(TICKET_CATEGORIES[0]);
  const [open, setOpen] = useState<string | null>(null);
  const [thread, setThread] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");

  async function load() {
    const res = await fetch("/api/support/tickets");
    const json = await res.json();
    setTickets(json.tickets ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!subject.trim() || !message.trim()) return;
    await fetch("/api/support/tickets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message, priority, category }),
    });
    setSubject(""); setMessage("");
    await load();
  }

  async function openTicket(id: string) {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    const res = await fetch(`/api/support/tickets/${id}`);
    const json = await res.json();
    setThread(json.messages ?? []);
  }

  async function sendReply(id: string) {
    if (!reply.trim()) return;
    await fetch(`/api/support/tickets/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply }),
    });
    setReply("");
    const res = await fetch(`/api/support/tickets/${id}`);
    const json = await res.json();
    setThread(json.messages ?? []);
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="space-y-3 lg:col-span-1">
        <h3 className="font-semibold">New ticket</h3>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        <div className="grid grid-cols-2 gap-2">
          <select className="rounded-lg border border-border bg-background px-2 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="rounded-lg border border-border bg-background px-2 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <textarea className="h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue…" />
        <Button onClick={create}>Submit ticket</Button>
        <p className="text-xs text-muted-foreground">File attachments: paste a link in your message for now.</p>
      </Card>

      <div className="space-y-2 lg:col-span-2">
        {tickets.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
        {tickets.map((t) => (
          <Card key={t.id} className="p-3">
            <button className="flex w-full items-center justify-between text-left" onClick={() => openTicket(t.id)}>
              <div>
                <div className="font-medium">{t.subject}</div>
                <div className="text-xs text-muted-foreground">{t.category} · {t.priority} · {new Date(t.created_at).toLocaleDateString()}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${t.status === "open" ? "bg-green-100 text-green-700" : t.status === "resolved" || t.status === "closed" ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-700"}`}>{t.status}</span>
            </button>
            {open === t.id && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {thread.map((m) => (
                  <div key={m.id} className={`rounded-lg p-2 text-sm ${m.is_staff ? "bg-brand-50 dark:bg-brand-900/20" : "bg-muted/50"}`}>
                    <div className="text-xs font-medium">{m.is_staff ? "Support" : "You"}</div>
                    <div>{m.body}</div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" />
                  <Button size="sm" onClick={() => sendReply(t.id)}>Send</Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
