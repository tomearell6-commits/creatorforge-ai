/**
 * Design Studio credit rules. Manual editing is always free; AI generation and
 * export conversion cost credits. Charged server-side only AFTER a successful
 * result (consistent with the rest of the platform — placeholder/failed runs
 * are free). Estimates are shown in the UI before generation.
 */

export const DESIGN_CREDIT_COSTS = {
  concept: 6,          // full AI design concept (layout + copy + colors + layers)
  aiImage: 5,          // AI background / hero image generation
  aiBackground: 4,     // AI background-only generation
  aiPrompt: 1,         // AI prompt-only assist
  footage: 10,         // live AI footage concept (video prompt + shot list)
  premiumTemplate: 15, // using a premium template
  exportStandard: 0,   // PNG / JPG export (client-side, free)
  exportPdf: 1,        // PDF conversion
  exportVideo: 20,     // MP4 / animated export
} as const;

export type DesignCreditAction = keyof typeof DESIGN_CREDIT_COSTS;

/** Reason strings written to the credit ledger (deduct_credits p_reason). */
export const DESIGN_CREDIT_REASONS: Record<DesignCreditAction, string> = {
  concept: "DESIGN_CONCEPT",
  aiImage: "DESIGN_AI_IMAGE",
  aiBackground: "DESIGN_AI_BACKGROUND",
  aiPrompt: "DESIGN_AI_PROMPT",
  footage: "DESIGN_FOOTAGE_CONCEPT",
  premiumTemplate: "DESIGN_PREMIUM_TEMPLATE",
  exportStandard: "DESIGN_EXPORT",
  exportPdf: "DESIGN_EXPORT_PDF",
  exportVideo: "DESIGN_EXPORT_VIDEO",
};

export function estimateDesignCredits(action: DesignCreditAction, categoryCredits?: number): number {
  if (action === "concept" && typeof categoryCredits === "number") return categoryCredits;
  return DESIGN_CREDIT_COSTS[action];
}

/** Whether an action bills at all (manual edits and standard exports are free). */
export function isBillable(action: DesignCreditAction): boolean {
  return DESIGN_CREDIT_COSTS[action] > 0;
}
