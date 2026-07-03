import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { OPS_PROVIDERS } from "@/lib/operations/registry";
import { computeBalanceStatus, estimateDaysRemaining } from "@/lib/operations/status";

export const dynamic = "force-dynamic";

/** Credit balances for credit-metered providers. GET seeds + computes; PATCH updates. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  const creditProviders = OPS_PROVIDERS.filter((p) => p.creditBased);
  const { data: existing } = await admin.from("operations_credit_balances").select("provider_id");
  const known = new Set((existing ?? []).map((r) => r.provider_id));
  const missing = creditProviders.filter((p) => !known.has(p.id)).map((p) => ({ provider_id: p.id }));
  if (missing.length) await admin.from("operations_credit_balances").insert(missing);

  const { data, error } = await admin
    .from("operations_credit_balances")
    .select("*")
    .order("provider_id", { ascending: true });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const balances = (data ?? []).map((row) => {
    const s = computeBalanceStatus(row.current_balance, row.full_balance, row.warning_pct, row.critical_pct);
    return {
      ...row,
      computedStatus: s.status,
      pct: s.pct,
      estDaysRemaining: estimateDaysRemaining(row.current_balance, row.daily_avg_usage),
      name: OPS_PROVIDERS.find((p) => p.id === row.provider_id)?.name ?? row.provider_id,
    };
  });
  return NextResponse.json({ ok: true, balances });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { providerId?: string; [k: string]: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.providerId) return NextResponse.json({ ok: false, message: "providerId is required" }, { status: 400 });

  const map: Record<string, string> = {
    unit: "unit", currentBalance: "current_balance", monthlyUsage: "monthly_usage",
    dailyAvgUsage: "daily_avg_usage", warningPct: "warning_pct", criticalPct: "critical_pct",
    fullBalance: "full_balance", lastTopupAt: "last_topup_at", lastTopupAmount: "last_topup_amount",
    topupUrl: "topup_url", notes: "notes",
  };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, col] of Object.entries(map)) if (k in body) patch[col] = body[k] === "" ? null : body[k];

  const { data, error } = await admin
    .from("operations_credit_balances")
    .update(patch)
    .eq("provider_id", body.providerId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.ops.credits.update", targetType: "operations_credit_balance", targetId: body.providerId });
  return NextResponse.json({ ok: true, balance: data });
}
