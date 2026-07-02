import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchWithTimeout } from "@/lib/http";

/**
 * POST /api/admin/infra/test/zerobounce — admin-only ZeroBounce credential test.
 *
 * Calls GET /v2/getcredits (free, no validation cost) to verify
 * ZEROBOUNCE_API_KEY authenticates.
 */
export async function POST() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const apiKey = process.env.ZEROBOUNCE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, configured: false, message: "ZEROBOUNCE_API_KEY is not set." }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({ api_key: apiKey });
    const res = await fetchWithTimeout(`https://api.zerobounce.net/v2/getcredits?${params.toString()}`, {}, 15_000);
    const bodyText = await res.text();
    let json: { Credits?: string; error?: string; success?: boolean } = {};
    try { json = JSON.parse(bodyText); } catch { /* non-JSON body */ }

    // ZeroBounce returns 200 even on bad keys, with Credits: "-1" or an error field.
    const credits = json.Credits != null ? Number(json.Credits) : null;
    const invalid = !res.ok || credits === -1 || !!json.error;
    if (invalid) {
      return NextResponse.json({
        ok: false, authenticated: false, status: res.status, message: json.error ?? bodyText.slice(0, 200),
        hint: "ZEROBOUNCE_API_KEY is invalid or revoked.",
      });
    }
    return NextResponse.json({ ok: true, authenticated: true, credits, message: "ZeroBounce accepted the key." });
  } catch (err) {
    return NextResponse.json({ ok: false, authenticated: false, message: err instanceof Error ? err.message : "Network error reaching ZeroBounce" }, { status: 502 });
  }
}
