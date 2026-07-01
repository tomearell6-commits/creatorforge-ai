import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/service";
import { creditLowEmail, creditCriticalEmail, creditExhaustedEmail } from "@/lib/email/templates";
import { planCredits } from "@/lib/constants";
import { captureError } from "@/lib/logger";

/**
 * Credit alert scanner (Vercel Cron). Secured by CRON_SECRET. Walks every
 * profile, computes remaining credits against the plan allowance, and sends the
 * single most-severe threshold alert crossed (low 25% / critical 10% /
 * exhausted 0%) — but only for thresholds enabled in the credit_thresholds rule.
 * The notification service owns dedup, per-user preferences, and delivery
 * logging, so this route just decides *what* to send.
 */
export const dynamic = "force-dynamic";

const DEFAULT_PERCENTAGES = [25, 10, 0];

async function run(request: Request) {
  if (process.env.CRON_SECRET && request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();

  // Enabled thresholds (fall back to defaults if the rule row is missing).
  const { data: rule } = await admin.from("notification_rules").select("config, enabled").eq("id", "credit_thresholds").maybeSingle();
  const percentages: number[] = Array.isArray(rule?.config?.percentages) ? rule!.config.percentages : DEFAULT_PERCENTAGES;

  const { data: profiles } = await admin.from("profiles").select("user_id, full_name, plan, credits");

  // Wallets keyed by user_id — one query, no N+1.
  const { data: wallets } = await admin.from("credit_wallets").select("user_id, used_credits, renewal_date");
  const walletBy = new Map<string, { used_credits: number | null; renewal_date: string | null }>();
  for (const w of wallets ?? []) walletBy.set(w.user_id, { used_credits: w.used_credits, renewal_date: w.renewal_date });

  let checked = 0;
  let sent = 0;

  for (const p of profiles ?? []) {
    checked++;
    try {
      const allowance = planCredits(p.plan) || 0;
      const remaining = p.credits ?? 0;
      const pct = allowance > 0 ? (remaining / allowance) * 100 : 0;
      const wallet = walletBy.get(p.user_id);
      const used = wallet?.used_credits ?? Math.max(0, allowance - remaining);
      const billingPeriod = wallet?.renewal_date ? String(wallet.renewal_date).slice(0, 10) : new Date().toISOString().slice(0, 7);

      // Most-severe threshold crossed (at most one alert per run).
      let type: string;
      let threshold: string;
      let title: string;
      let message: string;
      let mail: { subject: string; html: string; text?: string };
      const ctx = { name: p.full_name, planName: p.plan, remaining, used };

      if (remaining <= 0) {
        type = "credits_exhausted"; threshold = "0";
        title = "You're out of credits";
        message = "You've used all your credits. Generation is paused until you top up.";
        mail = creditExhaustedEmail(ctx);
      } else if (pct <= 10) {
        type = "credits_critical"; threshold = "10";
        title = "Credits almost finished";
        message = "You have under 10% of your credits left.";
        mail = creditCriticalEmail(ctx);
      } else if (pct <= 25) {
        type = "credits_low"; threshold = "25";
        title = "Credits running low";
        message = "You've used about 75% of your credits.";
        mail = creditLowEmail(ctx);
      } else {
        continue;
      }

      // Only alert on thresholds the admin has enabled.
      if (!percentages.includes(Number(threshold))) continue;

      const { data: authUser } = await admin.auth.admin.getUserById(p.user_id);
      const email = authUser.user?.email;
      if (!email) continue;

      const res = await notify(admin, {
        userId: p.user_id, email, type, category: "credit",
        title, message,
        ctaLabel: "Top Up Credits", ctaUrl: "/dashboard/credits",
        mail, dedup: { threshold, billingPeriod },
      });
      if (res.sent) sent++;
    } catch (e) {
      captureError(e, { category: "jobs", feature: "check-credit-alerts", userId: p.user_id });
    }
  }

  return NextResponse.json({ ok: true, checked, sent });
}

export async function GET(request: Request) {
  return run(request);
}
export async function POST(request: Request) {
  return run(request);
}
