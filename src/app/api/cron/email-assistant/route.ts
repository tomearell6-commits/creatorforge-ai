import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDailySummary } from "@/lib/email-assistant/summary";
import { draftReply, willUseRealEmailAI } from "@/lib/email-assistant/ai";
import { EMAIL_CREDIT_COSTS, SENSITIVE_CATEGORIES, type DraftTone } from "@/lib/email-assistant/safety";
import { sendEmail, emailConfigured } from "@/lib/email/send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Email Assistant daily job (Vercel Cron; fail-closed on CRON_SECRET).
 * 1. Daily attention summary for accounts that opted in — stored + emailed.
 * 2. Automation rules: draft_reply rules generate drafts for matching,
 *    still-undrafted messages (never for sensitive categories).
 * Credits are deducted via the service role only when real AI ran and the
 * user's balance covers it — otherwise the work is skipped, never negative.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const billable = willUseRealEmailAI();

  /** Service-role credit deduction (cron runs outside the user's session). */
  const chargeUser = async (userId: string, amount: number, reason: string): Promise<boolean> => {
    if (!billable || amount <= 0) return true; // placeholder mode is free
    const { data: p } = await admin.from("profiles").select("credits").eq("user_id", userId).maybeSingle();
    if (!p || (p.credits ?? 0) < amount) return false;
    await admin.from("profiles").update({ credits: (p.credits ?? 0) - amount }).eq("user_id", userId);
    await admin.from("credit_usage").insert({ user_id: userId, amount, reason });
    return true;
  };

  // ---- 1. Daily summaries ---------------------------------------------------
  const today = new Date().toISOString().slice(0, 10);
  const { data: accounts } = await admin
    .from("email_accounts")
    .select("id, user_id, email_address, daily_summary, status")
    .eq("status", "connected")
    .eq("daily_summary", true)
    .limit(20);

  let summaries = 0, summaryEmails = 0;
  for (const acct of accounts ?? []) {
    const { data: existing } = await admin
      .from("email_summary_reports").select("id")
      .eq("user_id", acct.user_id).eq("account_id", acct.id).eq("report_date", today).maybeSingle();
    if (existing) continue;

    const { summary, usedAI } = await buildDailySummary(admin, acct.user_id, acct.id);
    if (summary.counts.total === 0) continue; // nothing synced — nothing to report

    const charged = usedAI ? await chargeUser(acct.user_id, EMAIL_CREDIT_COSTS.dailySummary, "EMAIL_DAILY_SUMMARY") : true;
    if (!charged) continue; // insufficient balance — skip silently, no debt

    await admin.from("email_summary_reports").insert({
      user_id: acct.user_id, account_id: acct.id, report_date: today,
      summary_json: summary, credits_used: usedAI ? EMAIL_CREDIT_COSTS.dailySummary : 0,
    });
    summaries++;

    if (emailConfigured()) {
      const { data: authUser } = await admin.auth.admin.getUserById(acct.user_id);
      const to = authUser?.user?.email;
      if (to) {
        const html =
          `<div style="font-family:system-ui,sans-serif;max-width:560px">` +
          `<h2>Your CreatorsForge.io email attention summary</h2>` +
          `<p><strong>${summary.counts.critical}</strong> critical · <strong>${summary.counts.needsReply}</strong> need a reply · <strong>${summary.counts.drafts}</strong> drafts ready</p>` +
          (summary.critical.length ? `<h3>Critical</h3><ul>${summary.critical.map((c) => `<li><strong>${c.from}</strong>: ${c.subject} — ${c.reason}</li>`).join("")}</ul>` : "") +
          (summary.nextActions.length ? `<h3>Suggested next actions</h3><ol>${summary.nextActions.map((a) => `<li>${a}</li>`).join("")}</ol>` : "") +
          `<p><a href="https://www.creatorsforge.io/dashboard/email/needs-attention" style="color:#65a30d">Open your inbox assistant →</a></p></div>`;
        const r = await sendEmail({ to, subject: "Your CreatorForge.io email attention summary", html, text: `${summary.counts.critical} critical, ${summary.counts.needsReply} need a reply.` });
        if (r.sent) {
          summaryEmails++;
          await admin.from("email_summary_reports").update({ emailed: true })
            .eq("user_id", acct.user_id).eq("account_id", acct.id).eq("report_date", today);
        }
      }
    }
  }

  // ---- 2. Automation rules (draft_reply only; safe categories only) ----------
  const { data: rules } = await admin
    .from("email_automation_rules")
    .select("id, user_id, account_id, trigger_category, action, tone")
    .eq("is_active", true)
    .eq("action", "draft_reply")
    .limit(20);

  let ruleDrafts = 0;
  for (const rule of rules ?? []) {
    if (SENSITIVE_CATEGORIES.includes(rule.trigger_category as (typeof SENSITIVE_CATEGORIES)[number])) continue; // defense-in-depth
    const { data: matches } = await admin
      .from("email_classifications")
      .select("message_id, is_sensitive, email_messages!inner(id, user_id, account_id, from_name, from_address, subject, body_text, snippet, email_draft_replies(id))")
      .eq("user_id", rule.user_id)
      .eq("category", rule.trigger_category)
      .eq("is_sensitive", false)
      .limit(5);

    for (const m of matches ?? []) {
      const msg = Array.isArray(m.email_messages) ? m.email_messages[0] : m.email_messages;
      if (!msg || (Array.isArray(msg.email_draft_replies) && msg.email_draft_replies.length > 0)) continue;
      if (rule.account_id && msg.account_id !== rule.account_id) continue;

      const charged = await chargeUser(rule.user_id, EMAIL_CREDIT_COSTS.ruleExecution, "EMAIL_RULE_EXECUTION");
      if (!charged) break;

      const { draft, usedAI } = await draftReply(
        { fromName: msg.from_name, fromAddress: msg.from_address, subject: msg.subject, body: msg.body_text ?? msg.snippet },
        (rule.tone ?? "professional") as DraftTone
      );
      await admin.from("email_draft_replies").insert({
        message_id: msg.id, user_id: rule.user_id, tone: rule.tone ?? "professional",
        draft_text: draft, used_ai: usedAI, credits_used: usedAI ? EMAIL_CREDIT_COSTS.ruleExecution : 0,
      });
      await admin.from("email_activity_logs").insert({ user_id: rule.user_id, account_id: msg.account_id, action: "rule_run", detail: `rule "${rule.id}" drafted reply` });
      ruleDrafts++;
    }
    await admin.from("email_automation_rules").update({ runs_count: ruleDrafts, last_run_at: new Date().toISOString() }).eq("id", rule.id);
  }

  return NextResponse.json({ ok: true, summaries, summaryEmails, ruleDrafts });
}
