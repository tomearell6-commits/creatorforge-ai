import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchWithTimeout } from "@/lib/http";

/**
 * POST /api/admin/infra/test/elevenlabs — admin-only ElevenLabs credential test.
 *
 * Calls GET /v1/user (free, no generation cost) to verify ELEVENLABS_API_KEY
 * authenticates.
 */
export async function POST() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, configured: false, message: "ELEVENLABS_API_KEY is not set." }, { status: 400 });
  }

  try {
    const res = await fetchWithTimeout("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": apiKey },
    }, 15_000);
    const bodyText = await res.text();
    if (!res.ok) {
      let message = bodyText.slice(0, 300);
      try { message = JSON.parse(bodyText)?.detail?.message ?? message; } catch { /* non-JSON error body */ }
      return NextResponse.json({
        ok: false, authenticated: res.status !== 401 ? null : false, status: res.status, message,
        hint: res.status === 401 ? "ELEVENLABS_API_KEY is invalid or revoked." : `ElevenLabs returned ${res.status}.`,
      });
    }
    const json = JSON.parse(bodyText) as { subscription?: { tier?: string; character_count?: number; character_limit?: number } };
    return NextResponse.json({
      ok: true, authenticated: true,
      tier: json.subscription?.tier ?? null,
      charactersUsed: json.subscription?.character_count ?? null,
      charactersLimit: json.subscription?.character_limit ?? null,
      message: "ElevenLabs accepted the key.",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, authenticated: false, message: err instanceof Error ? err.message : "Network error reaching ElevenLabs" }, { status: 502 });
  }
}
