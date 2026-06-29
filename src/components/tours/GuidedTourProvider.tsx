"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getTour, type Tour } from "@/lib/tours/tours";
import { GuidedTourOverlay } from "./GuidedTourOverlay";

type TourCtx = { startTour: (id: string) => void; active: string | null };
const Ctx = createContext<TourCtx>({ startTour: () => {}, active: null });
export function useGuidedTour() { return useContext(Ctx); }

/**
 * Hosts the active guided tour. Mounted once in the dashboard layout so tour
 * state survives client-side navigation between pages. Other components start a
 * tour via useGuidedTour().startTour(id) or by dispatching the window event
 * `start-forge-tour` with { detail: { tourId } }. Tours never cost credits.
 */
export function GuidedTourProvider({ children }: { children: React.ReactNode }) {
  const [tour, setTour] = useState<Tour | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const persist = useCallback((tourId: string, step: number, opts?: { completed?: boolean; skipped?: boolean }) => {
    fetch("/api/tours/progress", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tourId, currentStep: step, completed: opts?.completed ?? false, skipped: opts?.skipped ?? false }),
    }).catch(() => {});
  }, []);

  const startTour = useCallback((id: string) => {
    const t = getTour(id);
    if (!t) return;
    setTour(t); setStepIndex(0); persist(id, 0);
  }, [persist]);

  // Allow non-React callers (e.g. the assistant) to start a tour.
  useEffect(() => {
    const handler = (e: Event) => { const id = (e as CustomEvent).detail?.tourId; if (id) startTour(id); };
    window.addEventListener("start-forge-tour", handler as EventListener);
    return () => window.removeEventListener("start-forge-tour", handler as EventListener);
  }, [startTour]);

  function next() { if (!tour) return; const n = Math.min(stepIndex + 1, tour.steps.length - 1); setStepIndex(n); persist(tour.id, n); }
  function back() { if (!tour) return; const n = Math.max(stepIndex - 1, 0); setStepIndex(n); persist(tour.id, n); }
  function skip() { if (!tour) return; persist(tour.id, stepIndex, { skipped: true }); setTour(null); }
  function finish() { if (!tour) return; persist(tour.id, tour.steps.length - 1, { completed: true }); setTour(null); }

  return (
    <Ctx.Provider value={{ startTour, active: tour?.id ?? null }}>
      {children}
      {tour && (
        <GuidedTourOverlay tour={tour} stepIndex={stepIndex} onNext={next} onBack={back} onSkip={skip} onFinish={finish} />
      )}
    </Ctx.Provider>
  );
}
