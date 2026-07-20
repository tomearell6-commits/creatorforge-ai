/**
 * Lead Generator premium access control — the single server-side gate every
 * lead route calls. Enforces: verified account, active paid plan, plan-level
 * access, admin enable/suspend, compliance acceptance, sender-profile setup,
 * and per-plan monthly-lead / daily-send limits. Never trust the frontend.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const COMPLIANCE_POLICY_VERSION = "2026-07-01";

export type AccessLevel = "none" | "limited" | "full" | "advanced";

/** Code defaults; a matching row in lead_usage_limits (admin-editable) overrides. */
export const LEAD_PLAN_ACCESS: Record<string, { level: AccessLevel; monthlyLeads: number; dailySends: number; automatedSend: boolean }> = {
  free:       { level: "none",     monthlyLeads: 0,      dailySends: 0,     automatedSend: false },
  creator:    { level: "limited",  monthlyLeads: 100,    dailySends: 0,     automatedSend: false },
  pro:        { level: "full",     monthlyLeads: 2000,   dailySends: 500,   automatedSend: true },
  agency:     { level: "advanced", monthlyLeads: 10000,  dailySends: 2000,  automatedSend: true },
  enterprise: { level: "advanced", monthlyLeads: 100000, dailySends: 20000, automatedSend: true },
};

export type LeadAccess = {
  plan: string;
  level: AccessLevel;
  verified: boolean;
  paid: boolean;
  featureEnabled: boolean;   // admin toggle (not suspended/disabled)
  complianceAccepted: boolean;
  senderProfileComplete: boolean;
  limits: { monthlyLeads: number; dailySends: number; automatedSend: boolean };
  usage: { leadsThisMonth: number; sendsToday: number };
};

/** What a route needs: view the module, run a search/verify/export, or send outreach. */
export type LeadNeed = "view" | "search" | "send";

export async function evaluateLeadAccess(supabase: SupabaseClient, userId: string, userEmailConfirmed: boolean): Promise<LeadAccess> {
  // Plan: prefer an active subscription, fall back to the profile plan.
  const [{ data: sub }, { data: profile }, { data: access }, { data: accept }, { data: sender }] = await Promise.all([
    supabase.from("subscriptions").select("plan, status").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("profiles").select("plan").eq("user_id", userId).maybeSingle(),
    supabase.from("lead_feature_access").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("lead_compliance_acceptance").select("version, accepted_at").eq("user_id", userId).order("accepted_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lead_sender_profiles").select("completed, compliance_confirmed").eq("user_id", userId).maybeSingle(),
  ]);

  const subActive = sub?.status === "active" && sub.plan && sub.plan !== "free";
  const plan = (subActive ? sub!.plan : profile?.plan) ?? "free";
  const paid = plan !== "free";

  // Limits: admin override row → code default.
  const { data: limitRow } = await supabase.from("lead_usage_limits").select("*").eq("plan", plan).maybeSingle();
  const def = LEAD_PLAN_ACCESS[plan] ?? LEAD_PLAN_ACCESS.free;
  const level: AccessLevel = (access?.access_level_override as AccessLevel) ?? (limitRow?.access_level as AccessLevel) ?? def.level;
  const limits = {
    monthlyLeads: limitRow?.monthly_leads ?? def.monthlyLeads,
    dailySends: limitRow?.daily_sends ?? def.dailySends,
    automatedSend: limitRow?.automated_send ?? def.automatedSend,
  };

  const featureEnabled = !(access?.suspended === true) && access?.enabled !== false;
  const complianceAccepted = accept?.version === COMPLIANCE_POLICY_VERSION;

  // Usage windows.
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
  const [{ count: leadsThisMonth }, { count: sendsToday }] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", monthStart.toISOString()),
    supabase.from("lead_usage_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("action", "send").gte("created_at", dayStart.toISOString()),
  ]);

  return {
    plan, level, verified: userEmailConfirmed, paid, featureEnabled, complianceAccepted,
    senderProfileComplete: !!(sender?.completed && sender?.compliance_confirmed),
    limits, usage: { leadsThisMonth: leadsThisMonth ?? 0, sendsToday: sendsToday ?? 0 },
  };
}

export type Block = { reason: string; action: "verify_account" | "upgrade_plan" | "accept_compliance" | "complete_sender_profile" | "contact_support" | "top_up_credits"; message: string };

/** Returns the first blocking condition for a given need, or null when allowed. */
export function firstBlock(a: LeadAccess, need: LeadNeed): Block | null {
  if (!a.verified) return { reason: "not_verified", action: "verify_account", message: "Please verify your email to use the Lead Generator." };
  if (!a.featureEnabled) return { reason: "suspended", action: "contact_support", message: "Lead Generator access is currently disabled for your account. Contact support." };
  if (a.level === "none" || !a.paid) return { reason: "plan_no_access", action: "upgrade_plan", message: "Lead Generator is available on the Business and Enterprise plans. Upgrade to unlock verified lead discovery and compliant outreach." };

  if (need === "view") return null;

  // search / verify / export need at least "limited".
  if (need === "search") {
    if (a.usage.leadsThisMonth >= a.limits.monthlyLeads) return { reason: "monthly_limit", action: "upgrade_plan", message: `You've reached your plan's monthly limit of ${a.limits.monthlyLeads} leads.` };
    return null;
  }

  // send needs full/advanced + automated sending + compliance + sender profile + daily limit.
  if (need === "send") {
    if (!a.limits.automatedSend || a.level === "limited") return { reason: "send_not_in_plan", action: "upgrade_plan", message: "Automated outreach is available on the Business and Enterprise plans." };
    if (!a.complianceAccepted) return { reason: "compliance_not_accepted", action: "accept_compliance", message: "Accept the Lead Generation Compliance Policy before sending outreach." };
    if (!a.senderProfileComplete) return { reason: "sender_profile_incomplete", action: "complete_sender_profile", message: "Complete your sender profile before sending outreach." };
    if (a.usage.sendsToday >= a.limits.dailySends) return { reason: "daily_send_limit", action: "contact_support", message: `You've reached your plan's daily sending limit of ${a.limits.dailySends} emails.` };
    return null;
  }
  return null;
}

/**
 * Route helper. Returns a NextResponse (403) to return immediately when blocked,
 * or the LeadAccess object when allowed. Usage:
 *   const gate = await guardLead(supabase, user.id, !!user.email_confirmed_at, "search");
 *   if (gate instanceof NextResponse) return gate;
 */
export async function guardLead(supabase: SupabaseClient, userId: string, emailConfirmed: boolean, need: LeadNeed): Promise<NextResponse | LeadAccess> {
  const access = await evaluateLeadAccess(supabase, userId, emailConfirmed);
  const block = firstBlock(access, need);
  if (block) return NextResponse.json({ error: block.message, reason: block.reason, action: block.action }, { status: 403 });
  return access;
}

/** Append a usage/compliance log line (best-effort). */
export async function logUsage(supabase: SupabaseClient, userId: string, action: string, detail?: string, quantity = 1): Promise<void> {
  await supabase.from("lead_usage_logs").insert({ user_id: userId, action, detail: detail ?? null, quantity }).then(() => {}, () => {});
}
