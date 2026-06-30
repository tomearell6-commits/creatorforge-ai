"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Creative = { id: string; headline: string | null; primary_text: string | null; cta: string | null; hashtags: string[]; variant_label: string | null; archived: boolean; created_at: string };

export function AdCreativeLibrary() {
  const [items, setItems] = useState<Creative[]>([]);
  const [q, setQ] = useState("");
  function load() { fetch("/api/ads/creatives").then((r) => r.json()).then((d) => setItems(d.creatives ?? [])); }
  useEffect(() => { load(); }, []);

  async function archive(id: string) { await fetch("/api/ads/creatives", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, archived: true }) }); load(); }
  async function remove(id: string) { await fetch(`/api/ads/creatives?id=${id}`, { method: "DELETE" }); load(); }

  const filtered = items.filter((c) => !q || `${c.headline} ${c.primary_text}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search creatives…" aria-label="Search creatives" className="max-w-sm" />
      {filtered.length === 0 ? (
        <Card className="py-10 text-center text-sm text-muted-foreground">No creatives yet. Generate some in the Ad Creative Studio.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{c.headline ?? "Untitled"}</span>
                {c.variant_label && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Var {c.variant_label}</span>}
              </div>
              <p className="text-sm text-muted-foreground">{c.primary_text}</p>
              {c.cta && <p className="text-xs font-medium text-brand-700">{c.cta}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => navigator.clipboard.writeText(`${c.headline}\n${c.primary_text}\n${c.cta}`)} className="text-xs text-brand-700 hover:underline">Copy</button>
                <button onClick={() => archive(c.id)} className="text-xs text-muted-foreground hover:underline">Archive</button>
                <button onClick={() => remove(c.id)} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
