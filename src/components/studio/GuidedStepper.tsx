"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type GuidedStep = { id: string; label: string };

/**
 * Shared numbered progress stepper for guided creation flows (Video, Real
 * Estate, Design, Books, …). Completed steps show a check; the current step is
 * ringed. Accessible (aria-current, icon + text) and horizontally scrollable on
 * mobile. Steps are clickable only when navigation is provided AND the step is
 * reachable (done, or at/behind the current one).
 */
export function GuidedStepper({
  steps,
  activeId,
  doneIds = [],
  onStep,
}: {
  steps: GuidedStep[];
  activeId: string;
  doneIds?: string[];
  onStep?: (id: string) => void;
}) {
  const activeIdx = steps.findIndex((s) => s.id === activeId);
  return (
    <nav aria-label="Progress" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2">
        {steps.map((s, i) => {
          const done = doneIds.includes(s.id);
          const active = s.id === activeId;
          const clickable = !!onStep && (done || i <= activeIdx);
          const state = done ? "Completed" : active ? "Current" : "Upcoming";
          return (
            <li key={s.id} className="flex items-center">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStep?.(s.id)}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${s.label}. ${state}.`}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
                  clickable ? "cursor-pointer hover:bg-muted" : "cursor-default",
                  active && "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    done
                      ? "bg-brand-600 text-white"
                      : active
                        ? "border-2 border-brand-600 text-brand-700 dark:text-brand-300"
                        : "border border-border text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn("font-medium", active || done ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
              </button>
              {i < steps.length - 1 && (
                <span aria-hidden className={cn("mx-0.5 h-px w-4 sm:w-6", i < activeIdx || done ? "bg-brand-600" : "bg-border")} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
