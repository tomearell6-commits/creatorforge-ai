"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, ImageIcon, Sparkles, Coins } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { DESIGN_CREDIT_COSTS } from "@/lib/design/credits";

type Asset = { id: string; url: string; name: string | null; asset_type: string; source: string; created_at: string };

/** Design asset library — register image URLs (uploads land in Supabase Storage
 *  via the media pipeline elsewhere) and reuse them across designs. */
export function DesignAssetLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ v: "error" | "success"; t: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/design/assets", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setAssets(json.assets ?? []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const add = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setMsg(null);
    try {
      const res = await fetch("/api/design/assets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name: name || undefined, assetType: "image", source: "upload" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add asset");
      setUrl(""); setName("");
      await load();
      setMsg({ v: "success", t: "Asset added." });
    } catch (err) {
      setMsg({ v: "error", t: err instanceof Error ? err.message : "Failed to add asset" });
    } finally {
      setAdding(false);
    }
  }, [url, name, load]);

  const remove = useCallback(async (id: string) => {
    await fetch("/api/design/assets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }, [load]);

  const generateAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setMsg(null);
    try {
      const res = await fetch("/api/design/image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim(), width: 1024, height: 1024 }),
      });
      if (res.status === 402) throw new Error("Not enough credits.");
      if (res.status === 429) throw new Error("Too many requests — wait a minute.");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Image generation failed");
      setAiPrompt("");
      await load();
      setMsg({ v: "success", t: "AI image generated and saved to your library." });
    } catch (err) {
      setMsg({ v: "error", t: err instanceof Error ? err.message : "Image generation failed" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Generate with AI (fal.ai FLUX) */}
      <form onSubmit={generateAi} className="flex flex-wrap items-end gap-2 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900 dark:bg-brand-950/10">
        <label className="min-w-[240px] flex-1">
          <span className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-brand-600" /> Generate with AI
          </span>
          <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="A minimalist product photo on a marble surface, soft daylight…"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
        </label>
        <span className="inline-flex items-center gap-1 pb-2 text-xs text-muted-foreground">
          <Coins className="h-3 w-3" /> ~{DESIGN_CREDIT_COSTS.aiImage}
        </span>
        <Button type="submit" disabled={generating || !aiPrompt.trim()}>
          {generating ? <Spinner size="sm" className="text-current" /> : <Sparkles className="h-4 w-4" />} Generate
        </Button>
      </form>

      <form onSubmit={add} className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4">
        <label className="min-w-[240px] flex-1">
          <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Image URL (https)</span>
          <input required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
        </label>
        <label className="w-40">
          <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
        </label>
        <Button type="submit" disabled={adding}>{adding ? <Spinner size="sm" className="text-current" /> : <Plus className="h-4 w-4" />} Add</Button>
      </form>

      {msg && <Alert variant={msg.v}>{msg.t}</Alert>}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading assets…</div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <ImageIcon className="mb-2 h-8 w-8 opacity-40" /> No assets yet. Add an image URL above to reuse it in your designs.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {assets.map((a) => (
            <div key={a.id} className="group relative overflow-hidden rounded-lg border border-border bg-card">
              <div className="relative aspect-square bg-muted">
                <Image src={a.url} alt={a.name ?? "asset"} fill sizes="200px" className="object-cover" unoptimized />
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="truncate text-xs">{a.name ?? "Untitled"}</span>
                <button onClick={() => remove(a.id)} className="rounded p-1 text-red-600 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100 dark:hover:bg-red-950/30" aria-label="Delete asset"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
