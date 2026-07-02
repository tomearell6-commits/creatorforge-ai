"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Coins, Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { getDesignFormat } from "@/config/designStudio";
import type { DesignLayerData } from "@/lib/design/types";

type Template = {
  id: string; name: string; category: string; group: string; format: string;
  width: number; height: number; previewUrl: string | null; layersJson: DesignLayerData[];
  creditsRequired: number; supportedExports: string[]; tags: string[];
  difficulty: string; style: string | null; isPremium: boolean; isFeatured: boolean;
};

const DIFFICULTIES = ["all", "beginner", "intermediate", "advanced"];

export function DesignTemplateGallery() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState("all");
  const [q, setQ] = useState("");
  const [using, setUsing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/design/templates", { cache: "no-store" });
        const json = await res.json();
        if (res.ok) setTemplates(json.templates ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => templates.filter((t) =>
    (difficulty === "all" || t.difficulty === difficulty) &&
    (!q || t.name.toLowerCase().includes(q.toLowerCase()) || t.tags.some((tag) => tag.includes(q.toLowerCase())))
  ), [templates, difficulty, q]);

  const openTemplate = useCallback(async (t: Template) => {
    setUsing(t.id);
    setError(null);
    try {
      const fmt = getDesignFormat(t.format);
      const projRes = await fetch("/api/design/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t.name, category: t.category, format: t.format, width: t.width || fmt.width, height: t.height || fmt.height, templateId: t.id }),
      });
      const projJson = await projRes.json();
      if (!projRes.ok) throw new Error(projJson.error ?? "Failed to create project");
      const projectId = projJson.project.id;
      if (Array.isArray(t.layersJson) && t.layersJson.length) {
        await fetch("/api/design/layers", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, layers: t.layersJson }),
        });
      }
      router.push(`/dashboard/design/editor?project=${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open template");
      setUsing(null);
    }
  }, [router]);

  if (loading) return <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground"><Spinner /> Loading templates…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" aria-label="Search templates"
          className="w-56 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
        <div className="flex gap-1">
          {DIFFICULTIES.map((d) => (
            <button key={d} onClick={() => setDifficulty(d)} className={`rounded-full px-3 py-1 text-xs capitalize ${d === difficulty ? "bg-brand-100 text-brand-700 dark:bg-brand-950/40" : "text-muted-foreground hover:bg-muted"}`}>{d}</button>
          ))}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((t) => {
          const bg = (t.layersJson?.find((l) => l.layerType === "background")?.styleJson?.fill as string) ?? "#0f172a";
          return (
            <div key={t.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative flex items-center justify-center text-white" style={{ aspectRatio: `${t.width} / ${t.height}`, background: bg }}>
                <Layers className="h-8 w-8 opacity-40" />
                {t.isFeatured && <Star className="absolute left-2 top-2 h-4 w-4 fill-brand-400 text-brand-400" />}
                {t.isPremium && <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950"><Crown className="h-3 w-3" /> Premium</span>}
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-semibold">{t.name}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{t.difficulty}</span>
                  {t.creditsRequired > 0 && <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3" /> {t.creditsRequired}</span>}
                </div>
                <Button size="sm" className="mt-2 w-full" onClick={() => openTemplate(t)} disabled={using === t.id}>
                  {using === t.id ? <Spinner size="sm" className="text-current" /> : null} Use template
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No templates match your filters.</p>}
    </div>
  );
}
