"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Tour } from "@/lib/tours/tours";
import { TourHighlight } from "./TourHighlight";
import { GuidedTourStepCard } from "./GuidedTourStepCard";

/** Renders the dim/highlight + step card for the active tour and drives navigation. */
export function GuidedTourOverlay({
  tour, stepIndex, onNext, onBack, onSkip, onFinish,
}: {
  tour: Tour; stepIndex: number;
  onNext: () => void; onBack: () => void; onSkip: () => void; onFinish: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const step = tour.steps[stepIndex];
  const [rect, setRect] = useState<DOMRect | null>(null);

  const stepBase = step.href ? step.href.split("?")[0] : null;
  const needsNavigation = !!stepBase && stepBase !== pathname;

  // Track the highlighted element's rect (re-measure on scroll/resize/step).
  const measure = useCallback(() => {
    if (needsNavigation || !step.target) { setRect(null); return; }
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setRect(el.getBoundingClientRect());
  }, [step.target, needsNavigation]);

  useEffect(() => {
    measure();
    const id = setInterval(measure, 500);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { clearInterval(id); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [measure, stepIndex, pathname]);

  // Card position: under the target if room, else above; else centered (rect null).
  let position: { top: number; left: number } | null = null;
  if (rect && typeof window !== "undefined") {
    const cardW = 320, approxH = 210;
    const left = Math.min(Math.max(rect.left, 12), window.innerWidth - cardW - 12);
    const below = rect.bottom + 12;
    const top = below + approxH > window.innerHeight ? Math.max(12, rect.top - approxH - 12) : below;
    position = { top, left };
  }

  function handleNext() {
    if (needsNavigation && step.href) { router.push(step.href); return; }
    onNext();
  }

  return (
    <>
      <TourHighlight rect={rect} />
      <GuidedTourStepCard
        title={step.title} body={step.body} stepIndex={stepIndex} total={tour.steps.length}
        position={position} needsNavigation={needsNavigation}
        onNext={handleNext} onBack={onBack} onSkip={onSkip} onFinish={onFinish}
      />
    </>
  );
}
