/**
 * Script generation orchestrator.
 *
 * Picks the real Claude provider when ANTHROPIC_API_KEY is set (and AI_FORCE_MOCK
 * is not "true"); otherwise falls back to the deterministic placeholder engine.
 * `billable` tells the caller whether to deduct credits (placeholder is free).
 */

import { generateWithClaude } from "./providers";
import { buildMockScript, type ScriptPromptInput } from "./prompts";

export type GenerateScriptInput = ScriptPromptInput;

export type GenerateScriptResult = {
  content: string;
  model: string;
  tokensUsed: number;
  billable: boolean;
};

/** True when a real (paid) AI call will be made for the current configuration. */
export function willUseRealAI(): boolean {
  return process.env.AI_FORCE_MOCK !== "true" && !!process.env.ANTHROPIC_API_KEY;
}

export async function generateScript(input: GenerateScriptInput): Promise<GenerateScriptResult> {
  if (willUseRealAI()) {
    const r = await generateWithClaude(input);
    return { ...r, billable: true };
  }
  return {
    ...buildMockScript(input),
    model: "creatorforge-placeholder-v1",
    billable: false,
  };
}
