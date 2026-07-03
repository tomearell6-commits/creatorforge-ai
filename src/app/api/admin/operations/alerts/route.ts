import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateOpsAlerts } from "@/lib/operations/status";
import { persistOpsAlerts } from "@/lib/operations/alerts";

export const dynamic = "force-dynamic";

/**
 * Unified operations alerts.
 * GET            — open alerts + recently resolved.
 * GET ?refresh=1 — re-evaluate every alert rule against current records first
 *                  (same engine the daily cron uses), then return.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  if (new URL(req.url).searchParams.get("refresh") === "1") {
    const [providers, keys, balances, quotas, webhooks] = await Promise.all([
      admin.from("operations_providers").select("provider_id, name, renewal_date, monthly_cost"),
      admin.from("operations_provider_keys").select("provider_id, key_name, last_rotated_at, rotation_days"),
      admin.from("operations_credit_balances").select("provider_id, current_balance, full_balance, warning_pct, critical_pct, daily_avg_usage"),
      admin.from("operations_usage_quotas").select("provider_id, quota_type, current_usage, monthly_limit"),
      admin.from("operations_webhook_health").select("provider_id, failure_count, last_success_at, last_failure_at"),
    ]);
    const evaluated = evaluateOpsAlerts({
      providers: providers.data ?? [], keys: keys.data ?? [], balances: balances.data ?? [],
      quotas: quotas.data ?? [], webhooks: webhooks.data ?? [],
    });
    await persistOpsAlerts(admin, evaluated);
  }

  const [open, resolved] = await Promise.all([
    admin.from("operations_alerts").select("*").eq("resolved", false).order("severity", { ascending: true }).order("created_at", { ascending: false }).limit(100),
    admin.from("operations_alerts").select("*").eq("resolved", true).order("resolved_at", { ascending: false }).limit(20),
  ]);
  if (open.error) return NextResponse.json({ ok: false, message: open.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, open: open.data ?? [], resolved: resolved.data ?? [] });
}
