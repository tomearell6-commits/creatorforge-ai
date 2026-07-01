import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWeeklyReport, saveWeeklyReport, weekRange } from "@/lib/reports/weekly";
import { weeklySummaryEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { captureError } from "@/lib/logger";

/**
 * Weekly-summary delivery scanner (Vercel Cron, hourly). Secured by CRON_SECRET.
 * Runs every hour; for each user it honors their preferred weekday/hour/timezone
 * and only delivers at the user's local delivery moment. Dedup is enforced per
 * (user, ISO week) via weekly_usage_reports so a user gets at most one summary
 * per completed week. The notification service owns the in-app row + branded
 * email + its own delivery log; we additionally write a weekly-specific audit
 * row per channel in weekly_summary_delivery_logs.
 */
export const dynamic = "force-dynamic";

type Prefs = {
  user_id: string;
  weekly_summary?: boolean | null;
  weekly_email?: boolean | null;
  weekly_inapp?: boolean | null;
  weekly_day?: string | null;
  weekly_time?: string | null;
  weekly_timezone?: string | null;
};

/** Current local weekday (lowercased) + hour (0-23) for an IANA tz. Falls back to UTC. */
function localMoment(tz: string): { weekday: string; hour: number } {
  const compute = (zone: string) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      weekday: "long",
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const weekday = (parts.find((p) => p.type === "weekday")?.value ?? "").toLowerCase();
    // hour "24" can appear for midnight in some environments — normalize to 0.
    const rawHour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const hour = Number.isFinite(rawHour) ? rawHour % 24 : 0;
    return { weekday, hour };
  };
  try {
    return compute(tz);
  } catch {
    return compute("UTC");
  }
}

async function log(admin: ReturnType<typeof createAdminClient>, row: Record<string, unknown>) {
  await admin.from("weekly_summary_delivery_logs").insert(row).then(() => {}, () => {});
}

async function run(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();

  const [profilesRes, prefsRes] = await Promise.all([
    admin.from("profiles").select("user_id, full_name"),
    admin.from("notification_preferences").select("user_id, weekly_summary, weekly_email, weekly_inapp, weekly_day, weekly_time, weekly_timezone"),
  ]);

  const profiles = (profilesRes.data ?? []) as { user_id: string; full_name?: string | null }[];
  const prefsByUser = new Map<string, Prefs>();
  for (const p of (prefsRes.data ?? []) as Prefs[]) prefsByUser.set(p.user_id, p);

  const { start, end } = weekRange(0);
  const weekStart = start.toISOString().slice(0, 10);

  let checked = 0;
  let sent = 0;

  for (const profile of profiles) {
    const userId = profile.user_id;
    checked++;
    try {
      const prefs = prefsByUser.get(userId);

      // Missing row ⇒ enabled by default.
      const enabled = prefs?.weekly_summary ?? true;
      if (enabled === false) continue;

      const day = prefs?.weekly_day ?? "monday";
      const timeHour = parseInt((prefs?.weekly_time ?? "09:00").split(":")[0], 10);
      const tz = prefs?.weekly_timezone ?? "UTC";

      const { weekday, hour } = localMoment(tz);
      if (weekday !== day || hour !== timeHour) continue; // not this user's delivery moment

      // Dedup: already delivered this completed week?
      const { data: existing } = await admin
        .from("weekly_usage_reports")
        .select("id")
        .eq("user_id", userId)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (existing) continue;

      const report = await buildWeeklyReport(admin, userId, start, end);
      const reportId = await saveWeeklyReport(admin, userId, report);

      const emailEnabled = prefs?.weekly_email ?? true;
      const inappEnabled = prefs?.weekly_inapp ?? true;

      if (!emailEnabled && !inappEnabled) {
        // Nothing to deliver, but the report is saved (which also dedups next hour).
        sent++;
        continue;
      }

      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      const email = authUser.user?.email ?? null;
      const fullName = profile.full_name ?? null;
      const now = new Date().toISOString();

      // Deliver directly using ONLY the weekly toggles (weekly_email / weekly_inapp).
      // We deliberately don't route through notify() so the general subscription
      // preferences don't double-gate the weekly digest.
      if (inappEnabled) {
        const { error } = await admin.from("notifications").insert({
          user_id: userId, type: "weekly_summary", status: "unread",
          title: "Your weekly summary is ready",
          body: `${report.creditsUsed} credits used, ${report.videosCreated} videos, ${report.postsPublished} posts published this week.`,
          link: "/dashboard/reports/weekly", cta_label: "View Weekly Report", cta_url: "/dashboard/reports/weekly",
          metadata: { category: "weekly", week_start: weekStart },
        });
        await log(admin, { user_id: userId, report_id: reportId, channel: "in_app", status: error ? "failed" : "sent", provider: "in_app", error_message: error?.message ?? null, sent_at: error ? null : now });
      }

      if (emailEnabled && email) {
        const mail = weeklySummaryEmail(fullName, report);
        const res = await sendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text });
        await log(admin, { user_id: userId, report_id: reportId, channel: "email", status: res.sent ? "sent" : "failed", provider: "brevo", error_message: res.error ?? null, sent_at: res.sent ? now : null });
      }

      sent++;
    } catch (e) {
      captureError(e, { category: "jobs", feature: "weekly-summary", userId });
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
