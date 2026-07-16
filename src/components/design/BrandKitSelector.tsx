"use client";

import { useCallback, useEffect, useState } from "react";
import { Palette, Plus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export type BrandKit = {
  id: string; name: string; logo_url: string | null; colors: string[]; fonts: string[];
  tone: string | null; brand_description: string | null; is_default: boolean;
};

/**
 * Brand kit picker/manager. `compact` renders an in-editor apply strip;
 * full mode (default) renders the manager with a create form + delete.
 */
export function BrandKitSelector({
  onApplyColors, onSelect, compact = false,
}: {
  onApplyColors?: (colors: string[]) => void;
  onSelect?: (kit: BrandKit) => void;
  compact?: boolean;
}) {
  const [kits, setKits] = useState<BrandKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", colors: "#0f172a, #ffffff, #84cc16", fonts: "Inter, Inter", tone: "", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/design/brand-kit", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setKits(json.kits ?? []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMsg(null);
    try {
      const res = await fetch("/api/design/brand-kit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || "My Brand Kit",
          colors: form.colors.split(",").map((c) => c.trim()).filter(Boolean),
          fonts: form.fonts.split(",").map((f) => f.trim()).filter(Boolean),
          tone: form.tone || undefined, brandDescription: form.description || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create brand kit");
      setForm({ name: "", colors: "#0f172a, #ffffff, #84cc16", fonts: "Inter, Inter", tone: "", description: "" });
      await load();
      setMsg("Brand kit created.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to create brand kit");
    } finally {
      setCreating(false);
    }
  }, [form, load]);

  const remove = useCallback(async (id: string) => {
    await fetch("/api/design/brand-kit", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }, [load]);

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Palette className="h-4 w-4 text-brand-600" /> Brand Kit</div>
        {loading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : kits.length === 0 ? (
          <p className="text-xs text-muted-foreground">No brand kits yet. Create one in Brand Kit.</p>
        ) : (
          <ul className="space-y-1.5">
            {kits.slice(0, 3).map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="flex">{k.colors.slice(0, 4).map((c, i) => <span key={i} className="h-4 w-4 rounded-full border border-border" style={{ background: c }} />)}</span>
                  <span className="truncate text-xs">{k.name}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onApplyColors?.(k.colors)}>Apply</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Plus className="h-4 w-4 text-brand-600" /> New brand kit</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Brand" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" /></label>
          <label className="block"><span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Tone</span>
            <input value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} placeholder="Confident, friendly" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" /></label>
          <label className="block"><span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Colors (comma-separated hex)</span>
            <input value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" /></label>
          <label className="block"><span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Fonts (comma-separated)</span>
            <input value={form.fonts} onChange={(e) => setForm({ ...form, fonts: e.target.value })} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" /></label>
        </div>
        <div className="mt-3 flex items-center justify-between">
          {msg ? <Alert variant="info" className="py-1.5">{msg}</Alert> : <span />}
          <Button type="submit" disabled={creating}>{creating ? <Spinner size="sm" className="text-current" /> : <Check className="h-4 w-4" />} Create</Button>
        </div>
      </form>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold">Your brand kits</div>
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Spinner size="sm" /> Loading…</div>
        ) : kits.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No brand kits yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {kits.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex">{k.colors.slice(0, 6).map((c, i) => <span key={i} className="h-5 w-5 rounded-full border border-border" style={{ background: c }} />)}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{k.name}{k.is_default && <span className="ml-2 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] text-brand-900">default</span>}</div>
                    <div className="truncate text-xs text-muted-foreground">{k.fonts.join(" · ") || "No fonts"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {onSelect && <Button size="sm" variant="ghost" onClick={() => onSelect(k)}>Use</Button>}
                  <button onClick={() => remove(k.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`Delete ${k.name}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
