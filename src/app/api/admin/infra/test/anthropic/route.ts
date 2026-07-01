import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "@/lib/admin";

/**
 * POST /api/admin/infra/test/anthropic — admin-only Claude credential test.
 *
 * Does one tiny messages.create to verify ANTHROPIC_API_KEY authenticates and
 * the configured model is accepted. Surfaces the real status + message (the
 * script route only logs these server-side and returns a generic 502).
 */
export async function POST() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.AI_MODEL || "claude-opus-4-8";
  if (!apiKey) {
    return NextResponse.json({ ok: false, configured: false, model, message: "ANTHROPIC_API_KEY is not set on the server." }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model,
      max_tokens: 8,
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
    });
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
    return NextResponse.json({ ok: true, authenticated: true, model: msg.model, reply: text, message: "Claude accepted the key and model." });
  } catch (err) {
    const status = (err as { status?: number })?.status ?? null;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      ok: false,
      authenticated: status !== 401 && status !== 403 ? null : false,
      model,
      status,
      message,
      hint:
        status === 401 || status === 403 ? "ANTHROPIC_API_KEY is invalid or revoked."
        : status === 404 ? `Model "${model}" not found for this account — set AI_MODEL to a model you have access to.`
        : status === 429 ? "Rate limited or out of credits/quota on the Anthropic account."
        : status === 400 ? "Bad request — often an unknown model id (check AI_MODEL)."
        : "Upstream error reaching Anthropic.",
    }, { status: 200 });
  }
}
