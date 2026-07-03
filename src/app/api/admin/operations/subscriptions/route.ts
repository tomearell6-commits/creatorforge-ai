import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { computeSubscriptionStatus } from "@/lib/operations/status";

export const dynamic = "force-dynamic";

/** Provider subscriptions. GET list w/ computed status · POST create · PATCH update. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("operations_subscriptions")
    .select("*")
    .order("renewal_date", { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const subscriptions = (data ?? []).map((row) => {
    const s = computeSubscriptionStatus(row.renewal_date);
    // Manual statuses (payment_failed / manual_review) take precedence over computed.
    const status = ["payment_failed", "manual_review"].includes(row.status) ? row.status : s.status;
    return { ...row, computedStatus: status, daysRemaining: s.daysRemaining };
  });
  return NextResponse.json({ ok: true, subscriptions });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.providerId) return NextResponse.json({ ok: false, message: "providerId is required" }, { status: 400 });

  const { data, error } = await admin
    .from("operations_subscriptions")
    .insert({
      provider_id: body.providerId, plan_name: body.planName ?? "Standard",
      renewal_date: body.renewalDate ?? null, billing_cycle: body.billingCycle ?? "monthly",
      monthly_cost: body.monthlyCost ?? 0, payment_method: body.paymentMethod ?? null,
      auto_renews: body.autoRenews ?? true, notes: body.notes ?? null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.ops.subscription.create", targetType: "operations_subscription", targetId: data.id });
  return NextResponse.json({ ok: true, subscription: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { id?: string; [k: string]: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });

  const map: Record<string, string> = {
    planName: "plan_name", renewalDate: "renewal_date", billingCycle: "billing_cycle",
    monthlyCost: "monthly_cost", paymentMethod: "payment_method", status: "status",
    autoRenews: "auto_renews", notes: "notes", lastRenewedAt: "last_renewed_at",
  };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, col] of Object.entries(map)) if (k in body) patch[col] = body[k] === "" ? null : body[k];

  const { data, error } = await admin.from("operations_subscriptions").update(patch).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.ops.subscription.update", targetType: "operations_subscription", targetId: String(body.id) });
  return NextResponse.json({ ok: true, subscription: data });
}
