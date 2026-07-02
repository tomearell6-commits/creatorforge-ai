import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { fetchWithTimeout } from "@/lib/http";

/**
 * POST /api/admin/infra/test/nowpayments — admin-only NOWPayments credential test.
 *
 * Calls GET /v1/min-amount (requires x-api-key, free — no payment/invoice
 * created) to verify NOWPAYMENTS_API_KEY authenticates.
 */
export async function POST() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, configured: false, message: "NOWPAYMENTS_API_KEY is not set." }, { status: 400 });
  }

  try {
    const res = await fetchWithTimeout("https://api.nowpayments.io/v1/min-amount?currency_from=btc&currency_to=usd", {
      headers: { "x-api-key": apiKey },
    }, 15_000);
    const bodyText = await res.text();
    if (!res.ok) {
      let message = bodyText.slice(0, 300);
      try { message = JSON.parse(bodyText)?.message ?? message; } catch { /* non-JSON error body */ }
      return NextResponse.json({
        ok: false, authenticated: res.status !== 401 && res.status !== 403 ? null : false, status: res.status, message,
        hint: res.status === 401 || res.status === 403 ? "NOWPAYMENTS_API_KEY is invalid or revoked." : `NOWPayments returned ${res.status}.`,
      });
    }
    const json = JSON.parse(bodyText) as { min_amount?: number };
    return NextResponse.json({ ok: true, authenticated: true, minAmountBtc: json.min_amount ?? null, message: "NOWPayments accepted the key." });
  } catch (err) {
    return NextResponse.json({ ok: false, authenticated: false, message: err instanceof Error ? err.message : "Network error reaching NOWPayments" }, { status: 502 });
  }
}
