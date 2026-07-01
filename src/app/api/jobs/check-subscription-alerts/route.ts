import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/service";
import { subscriptionReminderEmail } from "@/lib/email/templates";
import { captureError } from "@/lib/logger";

/**
 * Subscription renewal reminder scanner (Vercel Cron). Secured by CRON_SECRET.
 * For every active subscription with a known period end, computes days-until-
 * renewal and, when that count is one of the configured reminder days, sends a
 * reminder. The notification service owns dedup, preferences, and logging.
 */
export const dynamic = "force-dynamic";

const DEFAULT_DAYS = [14, 7, 3, 1];

async function run(request: Request) {
  if (process.env.CRON_SECRET && request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();

  const { data: rule } = await admin.from("notification_rules").select("config, enabled").eq("id", "subscription_reminders").maybeSingle();
  const reminderDays: number[] = Array.isArray(rule?.config?.days) ? rule!.config.days : DEFAULT_DAYS;

  const { data: subs } = await admin
    .from("subscriptions")
    .select("id, user_id, plan, status, current_period_end, provider_sub_id")
    .eq("status", "active")
    .not("current_period_end", "is", null);

  let checked = 0;
  let sent = 0;

  for (const sub of subs ?? []) {
    checked++;
    try {
      const days = Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86400000);
      if (!reminderDays.includes(days)) continue;

      const { data: authUser } = await admin.auth.admin.getUserById(sub.user_id);
      const email = authUser.user?.email;
      if (!email) continue;

      const renewalDate = String(sub.current_period_end).slice(0, 10);
      const res = await notify(admin, {
        userId: sub.user_id, email, type: "subscription_reminder", category: "subscription",
        title: `Subscription renews ${days === 1 ? "tomorrow" : "in " + days + " days"}`,
        message: `Your ${sub.plan} plan renews on ${renewalDate}. No action is needed if your payment details are up to date.`,
        ctaLabel: "Manage Billing", ctaUrl: "/dashboard/billing",
        mail: subscriptionReminderEmail({ planName: sub.plan, days, renewalDate }),
        dedup: { threshold: String(days), billingPeriod: renewalDate, subscriptionId: sub.provider_sub_id ?? sub.id },
      });
      if (res.sent) sent++;
    } catch (e) {
      captureError(e, { category: "jobs", feature: "check-subscription-alerts", subscriptionId: sub.id });
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
