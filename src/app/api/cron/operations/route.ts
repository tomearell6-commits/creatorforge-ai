import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateOpsAlerts } from "@/lib/operations/status";
import { persistOpsAlerts, emailCriticalAlerts } from "@/lib/operations/alerts";
import { MONTHLY_CHECKLIST_ITEMS } from "@/lib/operations/registry";
import { sendEmail, emailConfigured } from "@/lib/email/send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Operations daily sweep (Vercel Cron; fail-closed on CRON_SECRET).
 *
 * Every run (daily): evaluate renewals / key rotation / credits / quotas /
 * webhooks → persist deduped alerts → email admins about critical ones →
 * log per-provider health snapshots.
 * Mondays: include a weekly operations summary email.
 * 1st of month: create the monthly review checklist + send the monthly
 * summary. (Folded into one daily job so it also works on Vercel Hobby's
 * one-cron-per-day limit.)
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // 1. Evaluate all alert rules.
  const [providers, keys, balances, quotas, webhooks] = await Promise.all([
    admin.from("operations_providers").select("provider_id, name, renewal_date, monthly_cost, health_status"),
    admin.from("operations_provider_keys").select("provider_id, key_name, last_rotated_at, rotation_days"),
    admin.from("operations_credit_balances").select("provider_id, current_balance, full_balance, warning_pct, critical_pct, daily_avg_usage"),
    admin.from("operations_usage_quotas").select("provider_id, quota_type, current_usage, monthly_limit"),
    admin.from("operations_webhook_health").select("provider_id, failure_count, last_success_at, last_failure_at"),
  ]);
  const evaluated = evaluateOpsAlerts({
    providers: providers.data ?? [], keys: keys.data ?? [], balances: balances.data ?? [],
    quotas: quotas.data ?? [], webhooks: webhooks.data ?? [],
  }, now);
  const created = await persistOpsAlerts(admin, evaluated);

  // 2. Email critical alerts to admins (once per alert).
  const emailed = await emailCriticalAlerts(admin);

  // 3. Health log snapshot per provider.
  const logs = (providers.data ?? []).map((p) => ({
    provider_id: p.provider_id, status: p.health_status ?? "unknown", detail: "daily sweep",
  }));
  if (logs.length) await admin.from("operations_provider_health_logs").insert(logs);

  // 4. Monthly: ensure this month's checklist exists (1st, or first run of the month).
  const month = now.toISOString().slice(0, 7);
  let checklistCreated = false;
  const { data: existing } = await admin.from("operations_review_checklists").select("id").eq("month", month).maybeSingle();
  if (!existing) {
    const { data: cl } = await admin.from("operations_review_checklists").insert({ month }).select("id").single();
    if (cl) {
      await admin.from("operations_review_items").insert(
        MONTHLY_CHECKLIST_ITEMS.map((it, i) => ({ checklist_id: cl.id, item_key: it.key, label: it.label, sort_order: i }))
      );
      checklistCreated = true;
    }
  }

  // 5. Weekly (Monday) or monthly (1st) admin summary email.
  const isMonday = now.getUTCDay() === 1;
  const isFirst = now.getUTCDate() === 1;
  let summarySent = false;
  if ((isMonday || isFirst) && emailConfigured()) {
    const recipients = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
    const { data: open } = await admin.from("operations_alerts").select("severity, message").eq("resolved", false).limit(15);
    const spend = (providers.data ?? []).reduce((n, p) => n + (Number(p.monthly_cost) || 0), 0);
    const kind = isFirst ? "Monthly" : "Weekly";
    const html =
      `<div style="font-family:system-ui,sans-serif;max-width:560px">` +
      `<h2>CreatorsForge — ${kind} operations summary</h2>` +
      `<p><strong>Open alerts:</strong> ${(open ?? []).length} · <strong>Tracked monthly spend:</strong> $${spend}</p>` +
      ((open ?? []).length
        ? `<ul>${(open ?? []).map((a) => `<li>[${a.severity}] ${a.message}</li>`).join("")}</ul>`
        : `<p>No open alerts — all providers healthy. ✅</p>`) +
      (isFirst ? `<p>The monthly review checklist is ready.</p>` : "") +
      `<p><a href="https://www.creatorsforge.io/admin/operations" style="color:#65a30d">Open Operations Review Center →</a></p></div>`;
    for (const to of recipients) {
      const r = await sendEmail({ to, subject: `CreatorsForge ${kind} Operations Summary`, html, text: `${(open ?? []).length} open alerts. Spend: $${spend}.` });
      if (r.sent) summarySent = true;
    }
  }

  return NextResponse.json({
    ok: true, evaluated: evaluated.length, alertsCreated: created, emailed,
    healthLogs: logs.length, checklistCreated, summarySent,
  });
}
