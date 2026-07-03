import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST { providerId, amount?, newBalance?, notes? } — record a completed
 * credit top-up: stamps the date, updates the balance, and resets
 * full_balance so the low-balance percentages are measured from the top-up.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { providerId?: string; amount?: number; newBalance?: number; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.providerId) return NextResponse.json({ ok: false, message: "providerId is required" }, { status: 400 });

  const patch: Record<string, unknown> = {
    last_topup_at: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };
  if (body.amount != null) patch.last_topup_amount = body.amount;
  if (body.newBalance != null) { patch.current_balance = body.newBalance; patch.full_balance = body.newBalance; }
  if (body.notes !== undefined) patch.notes = body.notes;

  const { data, error } = await admin
    .from("operations_credit_balances")
    .update(patch)
    .eq("provider_id", body.providerId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  // Auto-resolve open low-credit alerts for this provider.
  await admin.from("operations_alerts")
    .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: user.email ?? user.id, admin_notes: "Top-up completed" })
    .eq("provider_id", body.providerId)
    .eq("alert_type", "low_credits")
    .eq("resolved", false);

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.ops.credits.topup", targetType: "operations_credit_balance", targetId: body.providerId, metadata: { amount: body.amount ?? null } });
  return NextResponse.json({ ok: true, balance: data });
}
