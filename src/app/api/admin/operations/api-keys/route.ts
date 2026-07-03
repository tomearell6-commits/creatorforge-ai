import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { OPS_PROVIDERS, isOpsProviderConfigured } from "@/lib/operations/registry";
import { computeKeyStatus, maskKey } from "@/lib/operations/status";

export const dynamic = "force-dynamic";

/**
 * API key rotation monitor. SECURITY: full keys are NEVER stored or returned —
 * only masked hints computed server-side from env presence, plus rotation
 * metadata the admin maintains.
 *
 * GET   — seeds one key row per rotation-tracked provider, returns computed
 *         rotation statuses. PATCH — update rotation metadata / notes / risk.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  // Seed a key record for every provider with a rotation policy.
  const tracked = OPS_PROVIDERS.filter((p) => p.rotationDays && p.envKeys.length > 0);
  const { data: existing } = await admin.from("operations_provider_keys").select("provider_id");
  const known = new Set((existing ?? []).map((r) => r.provider_id));
  const missing = tracked.filter((p) => !known.has(p.id)).map((p) => {
    const envName = p.envKeys.find((k) => !!process.env[k]) ?? p.envKeys[0];
    const value = envName ? process.env[envName] : undefined;
    return {
      provider_id: p.id, key_name: envName ?? "API key", environment: "production",
      masked_value: value ? maskKey(value) : null, rotation_days: p.rotationDays ?? 90,
      status: value ? "unknown" : "missing", risk_level: p.category === "payments" || p.id === "supabase-db" ? "high" : "medium",
    };
  });
  if (missing.length) await admin.from("operations_provider_keys").insert(missing);

  const { data, error } = await admin
    .from("operations_provider_keys")
    .select("*")
    .order("provider_id", { ascending: true });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const keys = (data ?? []).map((row) => {
    const def = OPS_PROVIDERS.find((p) => p.id === row.provider_id);
    const configured = def ? isOpsProviderConfigured(def) : false;
    const rot = computeKeyStatus(row.last_rotated_at, row.rotation_days);
    const status = !configured ? "missing" : row.status === "disabled" ? "disabled" : rot.status;
    return { ...row, computedStatus: status, rotationDue: rot.dueDate, daysUntilDue: rot.daysUntilDue, configured };
  });

  return NextResponse.json({ ok: true, keys });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { id?: string; markRotated?: boolean; [k: string]: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.markRotated) {
    patch.last_rotated_at = new Date().toISOString().slice(0, 10);
    patch.status = "healthy";
    // Refresh the masked hint from the (already-rotated) env value.
    const { data: row } = await admin.from("operations_provider_keys").select("provider_id").eq("id", body.id).maybeSingle();
    const def = row ? OPS_PROVIDERS.find((p) => p.id === row.provider_id) : undefined;
    const envName = def?.envKeys.find((k) => !!process.env[k]);
    if (envName) patch.masked_value = maskKey(process.env[envName]!);
  }
  const map: Record<string, string> = { notes: "notes", riskLevel: "risk_level", rotationDays: "rotation_days", status: "status", lastRotatedAt: "last_rotated_at" };
  for (const [k, col] of Object.entries(map)) if (k in body) patch[col] = body[k];

  const { data, error } = await admin.from("operations_provider_keys").update(patch).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, {
    userId: user.id, actorEmail: user.email ?? null,
    action: body.markRotated ? "admin.ops.key.rotated" : "admin.ops.key.update",
    targetType: "operations_provider_key", targetId: String(body.id),
  });
  return NextResponse.json({ ok: true, key: data });
}
