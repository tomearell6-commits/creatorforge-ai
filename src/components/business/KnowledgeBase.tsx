"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { KNOWLEDGE_KINDS } from "@/config/businessOps";

type Item = { id: string; kind: string; title: string; content: string; is_active: boolean; created_at: string };

export function KnowledgeBase() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [form, setForm] = useState({ kind: "faq", title: "", content: "" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/business/knowledge").then((r) => (r.ok ? r.json() : null)).then((d) => setItems(d?.items ?? [])).catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/business/knowledge", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setError(d.error ?? "Could not save."); return; }
    setForm({ kind: "faq", title: "", content: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Add knowledge</CardTitle>
        <CardDescription className="mt-1">
          FAQs, policies, pricing, brand guidelines — the AI uses active entries in every reply, document and campaign. Paste text (up to 20,000 characters per entry).
        </CardDescription>
        <form onSubmit={add} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="kb-kind">Kind</Label>
              <select id="kb-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                {KNOWLEDGE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label htmlFor="kb-title">Title</Label><Input id="kb-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          </div>
          <div>
            <Label htmlFor="kb-content">Content</Label>
            <textarea id="kb-content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit">Save to knowledge base</Button>
        </form>
      </Card>

      {!items ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={BookOpen} title="Knowledge base is empty" description="Add your FAQ or a policy — AI outputs immediately get sharper." />
      ) : (
        <div className="space-y-2">
          {items.map((k) => (
            <Card key={k.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{k.title}</span>
                  <Badge variant="outline">{KNOWLEDGE_KINDS.find((x) => x.id === k.kind)?.label ?? k.kind}</Badge>
                  <Badge variant={k.is_active ? "success" : "default"}>{k.is_active ? "Active" : "Off"}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{k.content}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost"
                  onClick={() => fetch("/api/business/knowledge", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: k.id, is_active: !k.is_active }) }).then(load)}>
                  {k.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600" aria-label={`Delete ${k.title}`}
                  onClick={() => fetch("/api/business/knowledge", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: k.id }) }).then(load)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
