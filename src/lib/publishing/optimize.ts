/**
 * Per-platform metadata optimization (SERVER-ONLY). Each destination gets copy
 * tuned to it (length, tone, hashtag conventions) rather than identical text.
 * Uses Claude when configured; deterministic fallback otherwise.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { PUBLISH_DESTINATIONS, type PublishDestinationId, type ContentTypeId } from "@/config/publishingCapabilities";

const MODEL = process.env.AI_MODEL || "claude-opus-4-8";
export function willUseRealAI() { return !!process.env.ANTHROPIC_API_KEY; }

export type OptimizedMeta = { title: string; description: string; caption: string; hashtags: string[] };

export type OptimizeBase = { title?: string; description?: string; caption?: string; hashtags?: string[] };

function fallback(base: OptimizeBase): OptimizedMeta {
  const title = (base.title ?? "").slice(0, 100);
  const description = (base.description ?? base.title ?? "").slice(0, 300);
  const caption = (base.caption ?? base.description ?? base.title ?? "").slice(0, 220);
  return { title, description, caption, hashtags: base.hashtags ?? [] };
}

export async function optimizeForDestination(
  contentType: ContentTypeId, destination: PublishDestinationId, base: OptimizeBase
): Promise<OptimizedMeta> {
  if (!willUseRealAI()) return fallback(base);
  const meta = PUBLISH_DESTINATIONS[destination];
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 400,
      system: `You are a social/SEO copywriter. Optimize post metadata for ${meta.label}. Match its norms (length, tone, hashtag style). Return ONLY compact JSON: {"title":"…","description":"…","caption":"…","hashtags":["…"]}. No prose.`,
      messages: [{ role: "user", content: `Content type: ${contentType}\nBase title: ${base.title ?? "(none)"}\nBase description: ${base.description ?? "(none)"}\nWrite ${meta.label}-optimized metadata.` }],
    });
    const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return {
      title: String(parsed.title ?? base.title ?? "").slice(0, 120),
      description: String(parsed.description ?? base.description ?? "").slice(0, 400),
      caption: String(parsed.caption ?? "").slice(0, 280),
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String).slice(0, 15) : (base.hashtags ?? []),
    };
  } catch {
    return fallback(base);
  }
}
