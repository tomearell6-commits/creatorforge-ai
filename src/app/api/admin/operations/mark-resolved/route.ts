import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST { alertId, notes?, confirm? } — resolve an operations alert.
 * Critical alerts require confirm:true (the UI shows a confirmation dialog).
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { alertId?: string; notes?: string; confirm?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.alertId) return NextResponse.json({ ok: false, message: "alertId is required" }, { status: 400 });

  const { data: alert } = await admin.from("operations_alerts").select("severity").eq("id", body.alertId).maybeSingle();
  if (!alert) return NextResponse.json({ ok: false, message: "Alert not found" }, { status: 404 });
  if (alert.severity === "critical" && !body.confirm) {
    return NextResponse.json({ ok: false, code: "confirm_required", message: "Resolving a critical alert requires confirmation." }, { status: 409 });
  }

  const { data, error } = await admin
    .from("operations_alerts")
    .update({
      resolved: true, resolved_at: new Date().toISOString(),
      resolved_by: user.email ?? user.id, admin_notes: body.notes ?? null,
    })
    .eq("id", body.alertId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.ops.alert.resolved", targetType: "operations_alert", targetId: String(body.alertId), metadata: { severity: alert.severity } });
  return NextResponse.json({ ok: true, alert: data });
}
