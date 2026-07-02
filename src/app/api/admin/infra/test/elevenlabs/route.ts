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
    // GET /v1/voices needs only voice-read access — closer to what the app's
    // text-to-speech calls require than /v1/user (which needs user_read and can
    // reject an otherwise-working, permission-scoped key).
    const res = await fetchWithTimeout("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    }, 15_000);
    const bodyText = await res.text();
    if (!res.ok) {
      let message = bodyText.slice(0, 300);
      try { message = JSON.parse(bodyText)?.detail?.message ?? message; } catch { /* non-JSON error body */ }
      const scopeIssue = /permission/i.test(message);
      return NextResponse.json({
        ok: false, authenticated: res.status !== 401 ? null : (scopeIssue ? true : false), status: res.status, message,
        hint: scopeIssue
          ? "The key authenticates but is missing a required permission scope. In ElevenLabs, edit the key and enable at least 'Text to Speech' (and ideally 'Voices' read) access — new keys can default to no scopes selected."
          : res.status === 401 ? "ELEVENLABS_API_KEY is invalid or revoked." : `ElevenLabs returned ${res.status}.`,
      });
    }
    const json = JSON.parse(bodyText) as { voices?: unknown[] };
    return NextResponse.json({
      ok: true, authenticated: true, voiceCount: json.voices?.length ?? 0,
      message: "ElevenLabs accepted the key and voice list access works.",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, authenticated: false, message: err instanceof Error ? err.message : "Network error reaching ElevenLabs" }, { status: 502 });
  }
}
