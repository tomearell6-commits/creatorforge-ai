/**
 * Real AI provider — Anthropic Claude via the official SDK.
 * Called by generate.ts when ANTHROPIC_API_KEY is configured.
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildScriptPrompt, type ScriptPromptInput } from "./prompts";

// Default to the latest Opus model. Override with AI_MODEL (e.g. claude-sonnet-4-6
// or claude-haiku-4-5) to trade capability for cost/latency.
const MODEL = process.env.AI_MODEL || "claude-opus-4-8";

export async function generateWithClaude(input: ScriptPromptInput) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });
  const { system, user, maxTokens } = buildScriptPrompt(input);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });

  // Concatenate text blocks (extended thinking is off, so these are the script).
  const content = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const tokensUsed =
    (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);

  return { content, model: message.model, tokensUsed };
}
