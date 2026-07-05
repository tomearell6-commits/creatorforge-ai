"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, CheckCircle2, PlayCircle, ArrowRight, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { tutorialThumbDataUri } from "@/lib/tutorials/thumb";
import { TUTORIAL_CATEGORIES, COMPLETE_THRESHOLD, type TutorialRecord } from "@/config/tutorialCatalog";
import { cn } from "@/lib/utils";

type Progress = { tutorial_id: string; watched_seconds: number; completed_at: string | null };

const CAT_ORDER: string[] = TUTORIAL_CATEGORIES.map((c) => c.name);

/** Watch Demo & Tutorial Center — search, categories, progress, CTAs. Free. */
export function TutorialCenter({ tutorials }: { tutorials: TutorialRecord[] }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [selected, setSelected] = useState<TutorialRecord | null>(tutorials[0] ?? null);
  const [progress, setProgress] = useState<Map<string, Progress>>(new Map());
  const [showCta, setShowCta] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSave = useRef(0);

  useEffect(() => {
    fetch("/api/tutorials/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.progress) setProgress(new Map((d.progress as Progress[]).map((p) => [p.tutorial_id, p])));
      })
      .catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const present = new Set(tutorials.map((t) => t.category));
    return CAT_ORDER.filter((c) => present.has(c));
  }, [tutorials]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tutorials
      .filter((t) => (!cat || t.category === cat))
      .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q))
      .sort((a, b) => CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category));
  }, [tutorials, query, cat]);

  const continueWatching = useMemo(
    () =>
      tutorials.filter((t) => {
        const p = progress.get(t.id);
        return p && p.watched_seconds > 5 && !p.completed_at;
      }),
    [tutorials, progress]
  );

  function saveProgress(t: TutorialRecord, seconds: number, completed = false) {
    fetch("/api/tutorials/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutorialId: t.id, watchedSeconds: Math.floor(seconds), completed }),
    }).catch(() => {});
    setProgress((prev) => {
      const next = new Map(prev);
      const existing = next.get(t.id);
      next.set(t.id, {
        tutorial_id: t.id,
        watched_seconds: Math.floor(seconds),
        completed_at: completed ? new Date().toISOString() : existing?.completed_at ?? null,
      });
      return next;
    });
  }

  function pick(t: TutorialRecord) {
    setSelected(t);
    setShowCta(false);
  }

  const related = selected ? tutorials.filter((t) => t.category === selected.category && t.id !== selected.id).slice(0, 4) : [];
  const selectedDone = selected ? !!progress.get(selected.id)?.completed_at : false;

  return (
    <div className="space-y-6">
      {/* Search + category filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tutorials…"
            aria-label="Search tutorials"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setCat("")} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", !cat ? "bg-brand-600 text-white" : "border border-border text-muted-foreground hover:bg-muted")}>All</button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", cat === c ? "bg-brand-600 text-white" : "border border-border text-muted-foreground hover:bg-muted")}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Continue watching */}
      {continueWatching.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Continue watching</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {continueWatching.map((t) => (
              <button key={t.id} onClick={() => pick(t)} className="w-52 shrink-0 overflow-hidden rounded-xl border border-border text-left hover:border-brand-500/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.thumbnail_url || tutorialThumbDataUri(t.title, t.category)} alt="" className="aspect-video w-full object-cover" />
                <p className="truncate px-2 py-1.5 text-xs font-medium">{t.title}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {tutorials.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Tutorials are coming soon" description="Check back shortly — walkthrough videos are on the way." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Player */}
          <div>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-black shadow-lg">
              {selected && (
                <video
                  ref={videoRef}
                  key={selected.id}
                  className="aspect-video w-full"
                  src={selected.video_url ? `${selected.video_url}#t=0.1` : undefined}
                  poster={selected.thumbnail_url || tutorialThumbDataUri(selected.title, selected.category)}
                  controls
                  playsInline
                  preload="metadata"
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    if (Date.now() - lastSave.current > 10_000 && v.currentTime > 3) {
                      lastSave.current = Date.now();
                      const done = v.duration > 0 && v.currentTime / v.duration >= COMPLETE_THRESHOLD;
                      saveProgress(selected, v.currentTime, done);
                    }
                  }}
                  onEnded={() => {
                    saveProgress(selected, videoRef.current?.duration ?? 0, true);
                    setShowCta(true);
                  }}
                />
              )}
              {/* CTA end card */}
              {showCta && selected?.cta_label && selected?.cta_url && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
                  <CheckCircle2 className="h-10 w-10 text-brand-400" />
                  <p className="text-lg font-bold text-white">Nice — tutorial complete!</p>
                  <p className="text-sm text-white/70">Ready to do it for real?</p>
                  <Button asChild variant="accent">
                    <Link href={selected.cta_url}>{selected.cta_label} <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <button onClick={() => setShowCta(false)} className="text-xs text-white/60 hover:text-white">Keep browsing</button>
                </div>
              )}
            </div>

            {selected && (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="brand">{selected.category}</Badge>
                  {selectedDone && <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" /> Completed</Badge>}
                  {selected.duration && <span className="text-xs text-muted-foreground">{selected.duration}</span>}
                </div>
                <h2 className="mt-2 text-xl font-bold">{selected.title}</h2>
                {selected.description && <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>}
                {selected.cta_label && selected.cta_url && (
                  <Button asChild size="sm" className="mt-3">
                    <Link href={selected.cta_url}>{selected.cta_label} <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                )}
              </div>
            )}

            {related.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold">Related tutorials</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {related.map((t) => (
                    <button key={t.id} onClick={() => pick(t)} className="flex items-center gap-2 rounded-xl border border-border p-2 text-left text-sm hover:bg-muted">
                      <PlayCircle className="h-4 w-4 shrink-0 text-brand-600" />
                      <span className="truncate">{t.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Playlist */}
          <div className="space-y-2">
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">No tutorials match “{query}”.</p>}
            {filtered.map((t) => {
              const p = progress.get(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => pick(t)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                    selected?.id === t.id ? "border-brand-500 bg-brand-500/5" : "border-border hover:bg-muted"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.thumbnail_url || tutorialThumbDataUri(t.title, t.category)} alt="" className="aspect-video w-24 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t.title}</span>
                    <span className="block text-xs text-muted-foreground">{t.category}{t.duration ? ` · ${t.duration}` : ""}</span>
                  </span>
                  {p?.completed_at ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" aria-label="Completed" />
                  ) : p && p.watched_seconds > 5 ? (
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-600">▶ resume</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
