import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { isFalConfigured } from "@/lib/media/providers/fal";

/**
 * POST /api/admin/infra/test/fal — admin-only fal.ai credential test.
 *
 * Submits one minimal clip request to fal's queue purely to check whether the
 * configured FAL_KEY authenticates, then immediately cancels the queued job to
 * avoid paying for a full generation. Reports the exact HTTP result:
 *   200/2xx  → key valid (authenticated), request queued + cancelled
 *   401/403  → key rejected (bad/expired key)
 *   other    → surfaced with status + body snippet
 */
const QUEUE = "https://queue.fal.run";
const MODEL = "fal-ai/minimax/video-01"; // cheapest AI-video tier

export async function POST() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  if (!isFalConfigured()) {
    return NextResponse.json({ ok: false, configured: false, message: "FAL_KEY is not set on the server." }, { status: 400 });
  }
  const key = process.env.FAL_KEY || process.env.FAL_API_KEY;
  const auth = { Authorization: `Key ${key}`, "Content-Type": "application/json" };

  let res: Response;
  try {
    res = await fetch(`${QUEUE}/${MODEL}`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ prompt: "authentication test — cancel immediately", duration: 5 }),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, authenticated: false, message: err instanceof Error ? err.message : "Network error reaching fal.ai" }, { status: 502 });
  }

  const bodyText = await res.text();
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(bodyText); } catch { /* non-JSON error body */ }

  if (res.ok) {
    // Queued successfully → key is valid. Cancel to avoid paying for the render.
    const requestId = (parsed.request_id as string) ?? null;
    const cancelUrl = (parsed.cancel_url as string) ?? (requestId ? `${QUEUE}/${MODEL}/requests/${requestId}/cancel` : null);
    let cancelled = false;
    if (cancelUrl) {
      try { const c = await fetch(cancelUrl, { method: "PUT", headers: auth }); cancelled = c.ok; } catch { /* best-effort */ }
    }
    return NextResponse.json({ ok: true, authenticated: true, status: res.status, requestId, cancelled, message: "fal.ai accepted the key. Test job queued and cancelled." });
  }

  const authFailure = res.status === 401 || res.status === 403;
  return NextResponse.json({
    ok: false,
    authenticated: false,
    status: res.status,
    message: authFailure
      ? "fal.ai rejected the key (401/403). The FAL_KEY value is invalid or expired."
      : `fal.ai returned ${res.status}.`,
    detail: bodyText.slice(0, 300),
  }, { status: 200 });
}
