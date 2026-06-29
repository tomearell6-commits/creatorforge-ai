/**
 * Classify an assistant message into a credit tier. Pure + deterministic so the
 * estimate shown before sending matches the charge applied server-side.
 *
 *   simple   (1cr) — navigation/help: "how do I", "where", "what is", "explain"
 *   workflow (2cr) — doing a task: create, generate, connect, publish, render, schedule
 *   advanced (3cr) — strategy/ideation: strategy, optimize, grow, scale, ideas, recommend
 */
import type { AssistantConfig } from "./config";

export type CostTier = "simple" | "workflow" | "advanced";

const ADVANCED = /\b(strateg|optimi[sz]e|grow|scale|roadmap|ideas?|brainstorm|recommend|plan\b|campaign|monetiz|audience|best way|which (is )?better)\b/i;
const WORKFLOW = /\b(create|generate|make|build|connect|publish|render|schedule|set ?up|upload|produce|write|design|export)\b/i;

export function classifyTier(message: string): CostTier {
  const m = message.toLowerCase();
  if (ADVANCED.test(m)) return "advanced";
  if (WORKFLOW.test(m)) return "workflow";
  return "simple";
}

export function tierCost(tier: CostTier, cfg: AssistantConfig): number {
  return tier === "advanced" ? cfg.cost_advanced : tier === "workflow" ? cfg.cost_workflow : cfg.cost_simple;
}

export function estimate(message: string, cfg: AssistantConfig): { tier: CostTier; credits: number } {
  const tier = classifyTier(message);
  return { tier, credits: tierCost(tier, cfg) };
}
