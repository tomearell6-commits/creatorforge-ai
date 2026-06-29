/**
 * Credit usage estimator. Surfaces "Estimated credits required" before an action
 * and decides whether the user can afford it. Mirrors real charge amounts from
 * constants so estimates match deductions. Used both server- and client-side
 * (pure functions, no I/O).
 */
import { ACTION_CREDIT_ESTIMATES, type ActionEstimate } from "@/lib/constants";

export function estimateForAction(actionId: string): ActionEstimate | null {
  return ACTION_CREDIT_ESTIMATES.find((a) => a.id === actionId) ?? null;
}

export type Affordability = {
  required: number;
  remaining: number;
  affordable: boolean;
  /** How many more credits are needed (0 when affordable). */
  shortfall: number;
};

export function canAfford(required: number, remaining: number): Affordability {
  const affordable = remaining >= required;
  return { required, remaining, affordable, shortfall: affordable ? 0 : required - remaining };
}

/** Rough "projects remaining" for a dashboard widget, based on an average cost. */
export function estimatedProjectsRemaining(remaining: number, avgPerProject = 90): number {
  if (avgPerProject <= 0) return 0;
  return Math.floor(remaining / avgPerProject);
}
