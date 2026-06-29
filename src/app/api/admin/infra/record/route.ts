import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getProvider } from "@/lib/infra/registry";
import { logAudit } from "@/lib/audit";

/**
 * POST { kind, provider_id, ...fields }
 * Record an infrastructure snapshot. Used by admins (manual entry) or a cron job
 * that polls provider APIs. Each kind maps to one table; only whitelisted columns
 * are written. API keys store a masked hint only — never the full secret.
 */
const TABLE: Record<string, { table: string; cols: string[] }> = {
  usage:    { table: "provider_usage",     cols: ["calls_today", "calls_month", "quota_limit", "quota_used"] },
  cost:     { table: "provider_costs",     cols: ["daily_usd", "monthly_usd", "period"] },
  health:   { table: "provider_health",    cols: ["status", "latency_ms", "error_rate", "webhook_ok", "last_success", "last_failure"] },
  balance:  { table: "provider_balances",  cols: ["amount", "currency", "low"] },
  renewal:  { table: "provider_renewals",  cols: ["plan", "renewal_date", "monthly_cost", "status"] },
  alert:    { table: "provider_alerts",    cols: ["severity", "title", "description", "recommended_action"] },
  apikey:   { table: "provider_api_keys",  cols: ["key_name", "environment", "masked_hint", "status", "last_used", "expires_at", "rotation_date"] },
  webhook:  { table: "provider_webhook_logs", cols: ["event", "ok", "http_status", "detail"] },
  forecast: { table: "provider_cost_forecasts", cols: ["forecast_month", "forecast_usd"] },
};

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown> & { kind?: string; provider_id?: string };
  const spec = body.kind ? TABLE[body.kind] : undefined;
  if (!spec) return NextResponse.json({ error: "Unknown record kind." }, { status: 400 });
  if (body.kind !== "alert" && (!body.provider_id || !getProvider(String(body.provider_id)))) {
    return NextResponse.json({ error: "Valid provider_id required." }, { status: 400 });
  }

  const row: Record<string, unknown> = {};
  if (body.provider_id) row.provider_id = body.provider_id;
  for (const c of spec.cols) if (body[c] !== undefined) row[c] = body[c];

  const { error } = await admin.from(spec.table).insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Mirror a status change into history for auditability.
  if (body.kind === "health" && body.status && body.provider_id) {
    await admin.from("provider_status_history").insert({ provider_id: body.provider_id, status: body.status });
  }

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "infra.record", targetType: spec.table, targetId: String(body.provider_id ?? ""), metadata: { kind: body.kind } });
  return NextResponse.json({ ok: true });
}
