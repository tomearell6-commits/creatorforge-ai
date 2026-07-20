/**
 * POST /api/webhooks/brevo — Brevo event webhook for the Lead Generator.
 *
 * Suppression is a legal requirement: once a recipient unsubscribes, hard-bounces,
 * or marks spam, they must never be emailed again. Brevo posts these events here;
 * we flip the matching lead(s) to a suppressed status so `canContact()` blocks any
 * future send. Because all tenants share one Brevo account, a Brevo unsubscribe is
 * account-wide, so we suppress the address across every list that holds it.
 *
 * Configure in Brevo → Transactional/Campaigns → Webhooks, pointing at
 * https://www.creatorsforge.io/api/webhooks/brevo?token=<BREVO_WEBHOOK_SECRET>.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Optional shared-secret gate so random POSTs can't forge suppressions.
  const secret = process.env.BREVO_WEBHOOK_SECRET;
  if (secret && new URL(request.url).searchParams.get("token") !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { event?: string; email?: string };
  const event = (body.event ?? "").toLowerCase().replace(/[\s-]/g, "_");
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: true });

  let patch: Record<string, unknown> | null = null;
  if (["unsubscribe", "unsubscribed"].includes(event)) patch = { lead_status: "unsubscribed", do_not_contact: true };
  else if (["hard_bounce", "hardbounce"].includes(event)) patch = { lead_status: "bounced" };
  else if (["spam", "complaint", "blocked", "invalid_email"].includes(event)) patch = { do_not_contact: true };

  if (patch) {
    patch.updated_at = new Date().toISOString();
    const admin = createAdminClient();
    // Match by email across all tenants (shared Brevo account → account-wide event).
    await admin.from("leads").update(patch).eq("email", email);
  }

  return NextResponse.json({ ok: true });
}
