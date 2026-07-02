"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Layers, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Project = { id: string; title: string; category: string | null; status: string; width: number; height: number; updated_at: string };

export default function Page() {
  const { confirm, dialog, setLoading, close } = useConfirm();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setListLoading] = useState(true);

  const load = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/design/projects", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setProjects(json.projects ?? []);
    } finally {
      setListLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const remove = useCallback(async (p: Project) => {
    const ok = await confirm({ title: "Delete design?", description: <><strong>{p.title}</strong> and its layers will be permanently removed.</>, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    setLoading(true);
    try {
      await fetch("/api/design/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) });
      await load();
    } finally {
      close();
    }
  }, [confirm, setLoading, close, load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My designs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every design project you have created.</p>
        </div>
        <Button asChild size="sm"><Link href="/dashboard/design/new"><Plus className="h-4 w-4" /> New Design</Link></Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner /> Loading…</div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
          <Layers className="mb-2 h-8 w-8 text-brand-500" />
          <p className="text-sm font-medium">No designs yet</p>
          <p className="mb-3 text-xs text-muted-foreground">Create your first design to see it here.</p>
          <Button asChild size="sm"><Link href="/dashboard/design/new"><Plus className="h-4 w-4" /> New Design</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {projects.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-xl border border-border bg-card">
              <Link href={`/dashboard/design/editor?project=${p.id}`} className="block">
                <div className="flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 dark:from-slate-800 dark:to-slate-900" style={{ aspectRatio: `${p.width} / ${p.height}` }}>
                  <Layers className="h-7 w-7" />
                </div>
              </Link>
              <div className="flex items-start justify-between gap-1 p-2.5">
                <div className="min-w-0">
                  <Link href={`/dashboard/design/editor?project=${p.id}`} className="block truncate text-sm font-medium hover:underline">{p.title}</Link>
                  <Badge variant="default" className="mt-1">{p.status}</Badge>
                </div>
                <button onClick={() => remove(p)} className="rounded p-1 text-red-600 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100 dark:hover:bg-red-950/30" aria-label={`Delete ${p.title}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {dialog}
    </div>
  );
}
