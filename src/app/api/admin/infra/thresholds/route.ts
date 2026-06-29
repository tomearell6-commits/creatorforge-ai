import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { DEFAULT_THRESHOLDS, type Thresholds } from "@/lib/infra/alerts";
import { logAudit } from "@/lib/audit";

const FIELDS: (keyof Thresholds)[] = [
  "warning_threshold", "critical_threshold", "renewal_reminder_days", "storage_alert_pct",
  "api_quota_alert_pct", "credit_alert_pct", "daily_spend_alert", "monthly_spend_alert",
];

/** GET — current alert thresholds (seeded defaults if unset). */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { data } = await gate.admin.from("provider_thresholds").select("*").eq("id", 1).maybeSingle();
  return NextResponse.json({ thresholds: (data as Thresholds) ?? DEFAULT_THRESHOLDS });
}

/** PUT — update thresholds (admin-only, audited). */
export async function PUT(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  const body = (await request.json().catch(() => ({}))) as Partial<Record<keyof Thresholds, number>>;
  const patch: Record<string, number | string> = { id: 1, updated_at: new Date().toISOString() };
  for (const f of FIELDS) if (typeof body[f] === "number") patch[f] = body[f] as number;

  const { error } = await admin.from("provider_thresholds").upsert(patch, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "infra.thresholds.updated", targetType: "provider_thresholds", metadata: patch });
  return NextResponse.json({ ok: true });
}
