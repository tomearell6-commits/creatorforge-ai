import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchWithTimeout } from "@/lib/http";

/**
 * POST /api/admin/infra/test/shotstack — admin-only Shotstack credential test.
 *
 * Calls GET /templates (free, no render cost) against the SAME environment
 * (SHOTSTACK_ENV: stage|v1) the app actually renders through, to verify
 * SHOTSTACK_API_KEY authenticates for that environment.
 */
export async function POST() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const apiKey = process.env.SHOTSTACK_API_KEY;
  const env = process.env.SHOTSTACK_ENV === "v1" ? "v1" : "stage";
  if (!apiKey) {
    return NextResponse.json({ ok: false, configured: false, env, message: "SHOTSTACK_API_KEY is not set." }, { status: 400 });
  }

  try {
    const res = await fetchWithTimeout(`https://api.shotstack.io/edit/${env}/templates`, {
      headers: { "x-api-key": apiKey },
    }, 15_000);
    const bodyText = await res.text();
    if (!res.ok) {
      let message = bodyText.slice(0, 300);
      try { message = JSON.parse(bodyText)?.message ?? message; } catch { /* non-JSON error body */ }
      return NextResponse.json({
        ok: false, authenticated: res.status !== 401 && res.status !== 403 ? null : false, status: res.status, env, message,
        hint: res.status === 401 || res.status === 403
          ? `SHOTSTACK_API_KEY is invalid for the "${env}" environment — Shotstack uses separate keys per sandbox/production.`
          : `Shotstack returned ${res.status}.`,
      });
    }
    return NextResponse.json({ ok: true, authenticated: true, env, message: `Shotstack accepted the key for the "${env}" environment.` });
  } catch (err) {
    return NextResponse.json({ ok: false, authenticated: false, env, message: err instanceof Error ? err.message : "Network error reaching Shotstack" }, { status: 502 });
  }
}
