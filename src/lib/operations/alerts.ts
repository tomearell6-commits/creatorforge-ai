/**
 * Operations alert persistence + admin email notifications.
 * SERVER-ONLY (uses the service-role client + email provider).
 *
 * persistOpsAlerts: upserts evaluated alerts by dedupe_key so each condition
 * creates ONE open alert per month. emailCriticalAlerts: emails every admin
 * (ADMIN_EMAILS) about critical alerts that haven't been emailed yet, then
 * stamps emailed_at so they are never re-sent.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import type { OpsAlert } from "./status";

export async function persistOpsAlerts(admin: SupabaseClient, alerts: OpsAlert[]): Promise<number> {
  let created = 0;
  for (const a of alerts) {
    const { error } = await admin
      .from("operations_alerts")
      .upsert(
        {
          alert_type: a.alert_type, severity: a.severity, provider_id: a.provider_id,
          message: a.message, recommended_action: a.recommended_action, dedupe_key: a.dedupe_key,
        },
        { onConflict: "dedupe_key", ignoreDuplicates: true }
      );
    if (!error) created++;
  }
  return created;
}

function adminRecipients(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export async function emailCriticalAlerts(admin: SupabaseClient): Promise<number> {
  if (!emailConfigured()) return 0;
  const recipients = adminRecipients();
  if (recipients.length === 0) return 0;

  const { data: pending } = await admin
    .from("operations_alerts")
    .select("id, alert_type, severity, provider_id, message, recommended_action")
    .eq("severity", "critical")
    .eq("resolved", false)
    .is("emailed_at", null)
    .limit(20);
  if (!pending?.length) return 0;

  let sent = 0;
  for (const alert of pending) {
    const subject = `CreatorsForge Alert: ${alert.message.slice(0, 90)}`;
    const html =
      `<div style="font-family:system-ui,sans-serif;max-width:560px">` +
      `<h2 style="color:#b91c1c">⚠ Critical operations alert</h2>` +
      `<p><strong>Provider:</strong> ${alert.provider_id ?? "platform"}</p>` +
      `<p><strong>Issue:</strong> ${alert.message}</p>` +
      `<p><strong>Recommended action:</strong> ${alert.recommended_action ?? "Review in the Operations Center."}</p>` +
      `<p><a href="https://www.creatorsforge.io/admin/operations/alerts" style="color:#65a30d">Open Operations Review Center →</a></p>` +
      `</div>`;
    let delivered = false;
    for (const to of recipients) {
      const r = await sendEmail({ to, subject, html, text: `${alert.message} — ${alert.recommended_action ?? ""}` });
      if (r.sent) delivered = true;
    }
    if (delivered) {
      await admin.from("operations_alerts").update({ emailed_at: new Date().toISOString() }).eq("id", alert.id);
      sent++;
    }
  }
  return sent;
}
