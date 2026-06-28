"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TICKET_STATUSES } from "@/lib/constants";

type Ticket = {
  id: string; subject: string; status: string; priority: string; category: string | null; created_at: string;
  support_messages?: { id: string; body: string; is_staff: boolean; created_at: string }[];
};

export function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reply, setReply] = useState<Record<string, string>>({});

  async function load() {
    const json = await (await fetch("/api/admin/support")).json();
    setTickets(json.tickets ?? []);
  }
  useEffect(() => { load(); }, []);

  async function send(id: string) {
    const message = reply[id];
    if (!message?.trim()) return;
    await fetch("/api/admin/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: id, message }) });
    setReply((r) => ({ ...r, [id]: "" }));
    await load();
  }
  async function setStatus(id: string, status: string) {
    await fetch("/api/admin/support", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: id, status }) });
    await load();
  }

  return (
    <div className="space-y-3">
      {tickets.length === 0 && <p className="text-sm text-muted-foreground">No tickets.</p>}
      {tickets.map((t) => (
        <Card key={t.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{t.subject}</div>
              <div className="text-xs text-muted-foreground">{t.category} · {t.priority} · {(t.support_messages?.length ?? 0)} msgs</div>
            </div>
            <select className="rounded-lg border border-border bg-background px-2 py-1 text-xs" value={t.status} onChange={(e) => setStatus(t.id, e.target.value)}>
              {TICKET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            {(t.support_messages ?? []).slice(-3).map((m) => (
              <div key={m.id} className={`rounded p-2 text-sm ${m.is_staff ? "bg-brand-50 dark:bg-brand-900/20" : "bg-muted/50"}`}>
                <span className="text-xs font-medium">{m.is_staff ? "Staff" : "User"}: </span>{m.body}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={reply[t.id] ?? ""} onChange={(e) => setReply((r) => ({ ...r, [t.id]: e.target.value }))} placeholder="Staff reply…" />
            <Button size="sm" onClick={() => send(t.id)}>Reply</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
