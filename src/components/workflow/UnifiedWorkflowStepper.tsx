"use client";

import { Check, Lock } from "lucide-react";
import { getWorkflow, WORKFLOW_STEPS, type WorkflowStepId } from "@/config/workflowCapabilities";
import type { ContentTypeId } from "@/config/publishingCapabilities";

export type StepperProps = {
  contentType: ContentTypeId;
  currentStep: WorkflowStepId;
  completedSteps: WorkflowStepId[];
  /** Only completed steps and the current step are navigable. */
  onStepClick?: (step: WorkflowStepId) => void;
};

/**
 * The universal six-stage progress header: Create → Review → Connect → Publish
 * → Promote → Analyze. Completed steps are navigable; future steps are locked so
 * required steps can't be skipped. Accessible (aria-current, icons + text, not
 * colour alone) and horizontally scrollable on mobile.
 */
export function UnifiedWorkflowStepper({ contentType, currentStep, completedSteps, onStepClick }: StepperProps) {
  const wf = getWorkflow(contentType);
  const steps = wf?.steps ?? WORKFLOW_STEPS.map((s) => ({ id: s.id, label: s.label, required: true, hint: "" }));
  const currentIdx = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Workflow progress" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2">
        {steps.map((s, i) => {
          const done = completedSteps.includes(s.id);
          const active = s.id === currentStep;
          const navigable = (done || active) && !!onStepClick;
          const locked = !done && !active && i > currentIdx;
          const state = done ? "Completed" : active ? "Current" : locked ? "Locked" : "Upcoming";
          return (
            <li key={s.id} className="flex items-center">
              <button
                type="button"
                disabled={!navigable}
                onClick={() => navigable && onStepClick?.(s.id)}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${s.label}. ${state}.${s.required ? "" : " Optional."}`}
                className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${navigable ? "cursor-pointer hover:bg-muted" : "cursor-default"}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done ? "bg-brand-600 text-white"
                      : active ? "border-2 border-brand-600 text-brand-700 dark:text-brand-300"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : locked ? <Lock className="h-3 w-3" /> : i + 1}
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className={`font-medium ${active ? "text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}{!s.required && <span className="ml-1 text-[10px] font-normal text-muted-foreground">(optional)</span>}
                  </span>
                </span>
              </button>
              {i < steps.length - 1 && <span aria-hidden className={`mx-0.5 h-px w-4 sm:w-6 ${done ? "bg-brand-600" : "bg-border"}`} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
