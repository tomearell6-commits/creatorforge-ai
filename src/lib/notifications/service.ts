/**
 * Notification service — the single path for credit/subscription/payment alerts.
 * Honors per-user preferences, prevents duplicate threshold sends, writes the
 * in-app row, sends the branded email, and records a delivery log for each
 * channel. Uses a service-role client (cron/webhook contexts). Never logs
 * secrets; validates CTA URLs to same-origin only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.creatorsforge.io";

export type PrefCategory = "credit" | "subscription" | "payment";

type Prefs = {
  email_credit: boolean; email_subscription: boolean; email_payment: boolean;
  inapp_credit: boolean; inapp_subscription: boolean; weekly_summary: boolean;
};
const DEFAULT_PREFS: Prefs = {
  email_credit: true, email_subscription: true, email_payment: true,
  inapp_credit: true, inapp_subscription: true, weekly_summary: false,
};

export async function getPreferences(admin: SupabaseClient, userId: string): Promise<Prefs> {
  const { data } = await admin.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
  return { ...DEFAULT_PREFS, ...(data ?? {}) };
}

/** True when this (user, type, threshold, period) was already sent. */
export async function wasNotified(admin: SupabaseClient, userId: string, type: string, threshold = "", billingPeriod = ""): Promise<boolean> {
  const { data } = await admin.from("notification_events")
    .select("id").eq("user_id", userId).eq("notification_type", type)
    .eq("threshold", threshold).eq("billing_period", billingPeriod).maybeSingle();
  return !!data;
}

/** Allow re-alerting for a period (e.g. after a top-up) by clearing its dedup rows. */
export async function clearCreditDedup(admin: SupabaseClient, userId: string, billingPeriod: string): Promise<void> {
  await admin.from("notification_events").delete().eq("user_id", userId)
    .in("notification_type", ["credits_low", "credits_critical", "credits_exhausted"])
    .eq("billing_period", billingPeriod);
}

function safeCta(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url;                 // internal path
  if (url.startsWith(APP_URL)) return url;             // same-origin absolute
  return null;                                         // reject anything else
}

async function log(admin: SupabaseClient, row: Record<string, unknown>) {
  await admin.from("notification_delivery_logs").insert(row).then(() => {}, () => {});
}

export type NotifyInput = {
  userId: string;
  email?: string | null;
  type: string;
  category: PrefCategory;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  mail?: { subject: string; html: string; text?: string } | null;
  dedup?: { threshold?: string; billingPeriod?: string; subscriptionId?: string };
};

export async function notify(admin: SupabaseClient, input: NotifyInput): Promise<{ sent: boolean; skipped?: boolean }> {
  const threshold = input.dedup?.threshold ?? "";
  const period = input.dedup?.billingPeriod ?? "";

  // Payment alerts can't be de-duplicated away silently, but threshold-based
  // credit/subscription alerts are guarded per period.
  if (input.dedup && (await wasNotified(admin, input.userId, input.type, threshold, period))) {
    return { sent: false, skipped: true };
  }

  const prefs = await getPreferences(admin, input.userId);
  const cta = safeCta(input.ctaUrl);
  // Payment/critical always deliver; others respect preferences.
  const isForced = input.category === "payment";
  const allowInApp = isForced || (input.category === "credit" ? prefs.inapp_credit : input.category === "subscription" ? prefs.inapp_subscription : true);
  const allowEmail = isForced || (input.category === "credit" ? prefs.email_credit : input.category === "subscription" ? prefs.email_subscription : prefs.email_payment);

  // 1. In-app notification row.
  if (allowInApp) {
    const { error } = await admin.from("notifications").insert({
      user_id: input.userId, type: input.type, title: input.title, body: input.message,
      link: cta, status: "unread", cta_label: input.ctaLabel ?? null, cta_url: cta,
      metadata: { category: input.category, threshold, billing_period: period },
    });
    await log(admin, { user_id: input.userId, notification_type: input.type, channel: "in_app", status: error ? "failed" : "sent", provider: "in_app", error_message: error?.message ?? null, sent_at: new Date().toISOString() });
  }

  // 2. Email.
  if (allowEmail && input.mail && input.email) {
    const res = await sendEmail({ to: input.email, subject: input.mail.subject, html: input.mail.html, text: input.mail.text });
    await log(admin, { user_id: input.userId, notification_type: input.type, channel: "email", status: res.sent ? "sent" : "failed", provider: "brevo", error_message: res.error ?? null, sent_at: res.sent ? new Date().toISOString() : null });
  }

  // 3. Record dedup event (ignore unique-conflict races).
  if (input.dedup) {
    await admin.from("notification_events").insert({
      user_id: input.userId, notification_type: input.type, threshold, billing_period: period,
      subscription_id: input.dedup.subscriptionId ?? null,
    }).then(() => {}, () => {});
  }

  return { sent: true };
}
