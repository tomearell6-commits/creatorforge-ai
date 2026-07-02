import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchWithTimeout } from "@/lib/http";

/**
 * POST /api/admin/infra/test/heygen — admin-only HeyGen credential test.
 *
 * Calls GET /v2/user/remaining_quota (free, no generation cost) to verify
 * HEYGEN_API_KEY authenticates.
 */
export async function POST() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, configured: false, message: "HEYGEN_API_KEY is not set." }, { status: 400 });
  }

  try {
    const res = await fetchWithTimeout("https://api.heygen.com/v2/user/remaining_quota", {
      headers: { "X-Api-Key": apiKey },
    }, 15_000);
    const bodyText = await res.text();
    if (!res.ok) {
      let message = bodyText.slice(0, 300);
      try { message = JSON.parse(bodyText)?.error?.message ?? message; } catch { /* non-JSON error body */ }
      return NextResponse.json({
        ok: false, authenticated: res.status !== 401 && res.status !== 403 ? null : false, status: res.status, message,
        hint: res.status === 401 || res.status === 403 ? "HEYGEN_API_KEY is invalid or revoked." : `HeyGen returned ${res.status}.`,
      });
    }
    const json = JSON.parse(bodyText) as { data?: { remaining_quota?: number } };
    return NextResponse.json({
      ok: true, authenticated: true,
      remainingQuota: json.data?.remaining_quota ?? null,
      message: "HeyGen accepted the key.",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, authenticated: false, message: err instanceof Error ? err.message : "Network error reaching HeyGen" }, { status: 502 });
  }
}
