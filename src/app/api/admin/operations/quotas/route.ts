import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { OPS_PROVIDERS } from "@/lib/operations/registry";
import { computeQuotaStatus } from "@/lib/operations/status";

export const dynamic = "force-dynamic";

/** Usage quotas. GET seeds one row per registry quota type + computes; PATCH updates. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  const { data: existing } = await admin.from("operations_usage_quotas").select("provider_id, quota_type");
  const known = new Set((existing ?? []).map((r) => `${r.provider_id}:${r.quota_type}`));
  const missing = OPS_PROVIDERS.flatMap((p) =>
    (p.quotaTypes ?? [])
      .filter((q) => !known.has(`${p.id}:${q}`))
      .map((q) => ({ provider_id: p.id, quota_type: q }))
  );
  if (missing.length) await admin.from("operations_usage_quotas").insert(missing);

  const { data, error } = await admin
    .from("operations_usage_quotas")
    .select("*")
    .order("provider_id", { ascending: true });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const quotas = (data ?? []).map((row) => {
    const s = computeQuotaStatus(Number(row.current_usage ?? 0), row.monthly_limit == null ? null : Number(row.monthly_limit));
    return { ...row, computedStatus: s.status, pct: s.pct, remaining: s.remaining, name: OPS_PROVIDERS.find((p) => p.id === row.provider_id)?.name ?? row.provider_id };
  });
  return NextResponse.json({ ok: true, quotas });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { id?: string; [k: string]: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });

  const map: Record<string, string> = { monthlyLimit: "monthly_limit", currentUsage: "current_usage", resetDate: "reset_date", notes: "notes" };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, col] of Object.entries(map)) if (k in body) patch[col] = body[k] === "" ? null : body[k];

  const { data, error } = await admin.from("operations_usage_quotas").update(patch).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.ops.quota.update", targetType: "operations_usage_quota", targetId: String(body.id) });
  return NextResponse.json({ ok: true, quota: data });
}
