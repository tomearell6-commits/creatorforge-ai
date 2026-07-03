import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST { subscriptionId, nextRenewalDate?, notes? } — mark a subscription
 * renewed; advances the renewal date one billing cycle when not supplied.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { subscriptionId?: string; nextRenewalDate?: string; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.subscriptionId) return NextResponse.json({ ok: false, message: "subscriptionId is required" }, { status: 400 });

  const { data: sub } = await admin
    .from("operations_subscriptions")
    .select("provider_id, renewal_date, billing_cycle, notes")
    .eq("id", body.subscriptionId)
    .maybeSingle();
  if (!sub) return NextResponse.json({ ok: false, message: "Subscription not found" }, { status: 404 });

  let next = body.nextRenewalDate;
  if (!next) {
    const base = sub.renewal_date ? new Date(sub.renewal_date) : new Date();
    if (sub.billing_cycle === "yearly") base.setFullYear(base.getFullYear() + 1);
    else base.setMonth(base.getMonth() + 1);
    next = base.toISOString().slice(0, 10);
  }

  const { data, error } = await admin
    .from("operations_subscriptions")
    .update({
      renewal_date: next, status: "active",
      last_renewed_at: new Date().toISOString().slice(0, 10),
      notes: body.notes ?? sub.notes, updated_at: new Date().toISOString(),
    })
    .eq("id", body.subscriptionId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  // Keep the provider record's renewal date in sync.
  await admin.from("operations_providers").update({ renewal_date: next, updated_at: new Date().toISOString() }).eq("provider_id", sub.provider_id);

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.ops.subscription.renewed", targetType: "operations_subscription", targetId: String(body.subscriptionId), metadata: { provider: sub.provider_id, next } });
  return NextResponse.json({ ok: true, subscription: data });
}
