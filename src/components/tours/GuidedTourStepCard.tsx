"use client";

import { useEffect, useId } from "react";
import { Sparkles, X } from "lucide-react";
import { TourProgressTracker } from "./TourProgressTracker";

type Pos = { top: number; left: number } | null;

/** The floating instruction card with Back / Next / Skip / Finish controls. */
export function GuidedTourStepCard({
  title, body, stepIndex, total, position, needsNavigation,
  onNext, onBack, onSkip, onFinish,
}: {
  title: string; body: string; stepIndex: number; total: number; position: Pos; needsNavigation: boolean;
  onNext: () => void; onBack: () => void; onSkip: () => void; onFinish: () => void;
}) {
  const isLast = stepIndex === total - 1;
  const titleId = useId();
  const style: React.CSSProperties = position
    ? { top: position.top, left: position.left }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onSkip(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onSkip]);

  return (
    <div className="fixed z-[95] w-[calc(100vw-2rem)] max-w-xs rounded-2xl border border-border bg-card p-4 shadow-2xl" style={style} role="dialog" aria-labelledby={titleId}>
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700"><Sparkles className="h-3.5 w-3.5" /> Forge AI tour</span>
        <button onClick={onSkip} className="text-muted-foreground hover:text-foreground" title="Skip tour" aria-label="Skip tour"><X className="h-4 w-4" /></button>
      </div>
      <h3 id={titleId} className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>

      <div className="mt-3 flex items-center justify-between">
        <TourProgressTracker total={total} current={stepIndex} />
        <span className="text-xs text-muted-foreground">{stepIndex + 1}/{total}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button onClick={onSkip} className="text-xs text-muted-foreground hover:underline">Skip tour</button>
        <div className="flex gap-2">
          {stepIndex > 0 && <button onClick={onBack} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">Back</button>}
          {isLast
            ? <button onClick={onFinish} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">Finish</button>
            : <button onClick={onNext} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">{needsNavigation ? "Go there" : "Next"}</button>}
        </div>
      </div>
    </div>
  );
}
