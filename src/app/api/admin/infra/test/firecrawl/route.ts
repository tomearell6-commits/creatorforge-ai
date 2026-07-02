import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchWithTimeout } from "@/lib/http";

/**
 * POST /api/admin/infra/test/firecrawl — admin-only Firecrawl credential test.
 *
 * Calls GET /v1/team/credit-usage (free, no scrape cost) to verify
 * FIRECRAWL_API_KEY authenticates.
 */
export async function POST() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, configured: false, message: "FIRECRAWL_API_KEY is not set." }, { status: 400 });
  }

  try {
    const res = await fetchWithTimeout("https://api.firecrawl.dev/v1/team/credit-usage", {
      headers: { Authorization: `Bearer ${apiKey}` },
    }, 15_000);
    const bodyText = await res.text();
    if (!res.ok) {
      let message = bodyText.slice(0, 300);
      try { message = JSON.parse(bodyText)?.error ?? message; } catch { /* non-JSON error body */ }
      return NextResponse.json({
        ok: false, authenticated: res.status !== 401 && res.status !== 403 ? null : false, status: res.status, message,
        hint: res.status === 401 || res.status === 403 ? "FIRECRAWL_API_KEY is invalid or revoked." : `Firecrawl returned ${res.status}.`,
      });
    }
    const json = JSON.parse(bodyText) as { data?: { remaining_credits?: number; plan_credits?: number } };
    return NextResponse.json({
      ok: true, authenticated: true,
      remainingCredits: json.data?.remaining_credits ?? null,
      planCredits: json.data?.plan_credits ?? null,
      message: "Firecrawl accepted the key.",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, authenticated: false, message: err instanceof Error ? err.message : "Network error reaching Firecrawl" }, { status: 502 });
  }
}
