import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchWithTimeout } from "@/lib/http";

/**
 * POST /api/admin/infra/test/openai — admin-only OpenAI credential test.
 *
 * Calls GET /v1/models (free, no generation cost) to verify OPENAI_API_KEY
 * authenticates, and checks that gpt-image-1 is in the accessible model list.
 */
export async function POST() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, configured: false, message: "OPENAI_API_KEY is not set." }, { status: 400 });
  }

  try {
    const res = await fetchWithTimeout("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    }, 15_000);
    const bodyText = await res.text();
    if (!res.ok) {
      let message = bodyText.slice(0, 300);
      try { message = JSON.parse(bodyText)?.error?.message ?? message; } catch { /* non-JSON error body */ }
      return NextResponse.json({
        ok: false, authenticated: res.status !== 401 && res.status !== 403 ? null : false, status: res.status, message,
        hint: res.status === 401 ? "OPENAI_API_KEY is invalid or revoked." : `OpenAI returned ${res.status}.`,
      });
    }
    const json = JSON.parse(bodyText) as { data?: { id: string }[] };
    const hasImageModel = (json.data ?? []).some((m) => ["gpt-image-2", "gpt-image-1.5", "gpt-image-1-mini"].includes(m.id));
    return NextResponse.json({
      ok: true, authenticated: true, modelCount: json.data?.length ?? 0, hasImageModel,
      message: hasImageModel ? "OpenAI accepted the key; a current gpt-image model is accessible." : "OpenAI accepted the key, but no current gpt-image model (gpt-image-2, 1.5 or mini) was in the model list for this account.",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, authenticated: false, message: err instanceof Error ? err.message : "Network error reaching OpenAI" }, { status: 502 });
  }
}
