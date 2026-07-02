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
    // The app only ever calls POST /v1/text-to-speech/{voiceId} (voice.ts) —
    // read endpoints like /v1/user (user_read) and /v1/voices (voices_read)
    // need DIFFERENT scopes a restricted "Text to Speech"-only key won't have,
    // so they're not a valid proxy. Do the real, minimal call instead: a
    // 2-character synthesis costs a negligible fraction of a cent.
    const voiceId = "9BWtsMINqrJLrRacOk9x"; // "Aria" premade voice, same default the app maps
    const res = await fetchWithTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hi", model_id: "eleven_turbo_v2_5" }),
    }, 20_000);
    if (!res.ok) {
      const bodyText = await res.text();
      let message = bodyText.slice(0, 300);
      try { message = JSON.parse(bodyText)?.detail?.message ?? message; } catch { /* non-JSON error body */ }
      const scopeIssue = /permission/i.test(message);
      return NextResponse.json({
        ok: false, authenticated: res.status !== 401 ? null : (scopeIssue ? true : false), status: res.status, message,
        hint: scopeIssue
          ? "The key authenticates but is missing the 'Text to Speech' permission. In ElevenLabs, edit the key and set Text to Speech to 'Access'."
          : res.status === 401 ? "ELEVENLABS_API_KEY is invalid or revoked." : `ElevenLabs returned ${res.status}.`,
      });
    }
    const bytes = (await res.arrayBuffer()).byteLength;
    return NextResponse.json({
      ok: true, authenticated: true, audioBytes: bytes,
      message: "ElevenLabs accepted the key and synthesized audio successfully.",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, authenticated: false, message: err instanceof Error ? err.message : "Network error reaching ElevenLabs" }, { status: 502 });
  }
}
