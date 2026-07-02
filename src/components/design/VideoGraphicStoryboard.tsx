"use client";

import { Film, Camera, Lightbulb, Mic, Type, Clapperboard } from "lucide-react";
import type { FootageConcept } from "@/lib/design/types";

/** Presentational storyboard for a generated FootageConcept. */
export function VideoGraphicStoryboard({ concept }: { concept: FootageConcept }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><Clapperboard className="h-4 w-4 text-brand-600" /> {concept.title}</div>
        <div className="mt-3 space-y-2 text-sm">
          <Field icon={Film} label="Video prompt" value={concept.videoPrompt} mono />
          <Field icon={Camera} label="Camera direction" value={concept.cameraDirection} />
          <Field icon={Lightbulb} label="Lighting" value={concept.lighting} />
          <Field icon={Mic} label="Suggested voiceover" value={concept.suggestedVoiceover} />
          <Field icon={Type} label="Caption" value={concept.captionText} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Shot list</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {concept.shotList.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3">
              <div className="flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white">
                <span className="text-2xl font-bold opacity-40">{i + 1}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{s.shot}</span>
                <span className="text-xs text-muted-foreground">{s.durationSeconds}s</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Scene script</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{concept.sceneScript}</p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, mono }: { icon: typeof Film; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={mono ? "break-words font-mono text-xs" : "text-sm"}>{value}</div>
      </div>
    </div>
  );
}
