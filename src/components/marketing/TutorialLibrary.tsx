"use client";

import { useState } from "react";
import { PlayCircle, GraduationCap } from "lucide-react";
import { tutorialThumbDataUri } from "@/lib/tutorials/thumb";

export function TutorialLibrary({ tutorials }: { tutorials: any[] }) {
  const categories = Array.from(new Set(tutorials.map((t) => t.category)));
  const [activeCat, setActiveCat] = useState(categories[0] ?? "Getting Started");
  const inCat = tutorials.filter((t) => t.category === activeCat);
  const [selected, setSelected] = useState<any>(tutorials[0] ?? null);

  if (tutorials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
        <GraduationCap className="mx-auto h-8 w-8" />
        <p className="mt-3">Tutorials are coming soon.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      {/* Player */}
      <div>
        <div className="overflow-hidden rounded-2xl border border-border bg-ink shadow-lg">
          {/* No autoPlay: browsers block autoplay-with-sound, which left a black
              box that looked broken. The #t=0.1 media fragment makes the browser
              seek slightly in, so the first real frame shows as the preview. */}
          {selected && (
            <video
              key={selected.id}
              className="aspect-video w-full"
              src={`${selected.video_url}#t=0.1`}
              controls
              playsInline
              preload="metadata"
              poster={selected.thumbnail_url || tutorialThumbDataUri(selected.title, selected.category)}
            />
          )}
        </div>
        {selected && (
          <div className="mt-4">
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-900 dark:bg-brand-500/15 dark:text-brand-300">{selected.category}</span>
            <h2 className="mt-2 text-xl font-bold text-ink dark:text-foreground">{selected.title}</h2>
            {selected.description && <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>}
          </div>
        )}
      </div>

      {/* Playlist */}
      <div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCat(c)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${activeCat === c ? "bg-brand-600 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`}>{c}</button>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {inCat.map((t) => (
            <button key={t.id} onClick={() => setSelected(t)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selected?.id === t.id ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-border hover:bg-muted"}`}>
              <PlayCircle className={`h-5 w-5 shrink-0 ${selected?.id === t.id ? "text-brand-600" : "text-muted-foreground"}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink dark:text-foreground">{t.title}</span>
                <span className="block text-xs text-muted-foreground capitalize">{t.level}{t.duration ? ` · ${t.duration}` : ""}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
