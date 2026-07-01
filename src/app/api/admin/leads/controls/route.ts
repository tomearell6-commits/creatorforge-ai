import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { apiError } from "@/lib/api/respond";
import type { AccessLevel } from "@/lib/leads/access";

const LEVELS: AccessLevel[] = ["none", "limited", "full", "advanced"];

/**
 * Lead Generator admin controls (admin-only).
 * GET  -> all plan usage limits, recent admin actions, high-bounce users, suspended users.
 * POST -> set_limits | suspend | unsuspend | set_access | toggle. Every action is
 *         recorded in lead_admin_actions.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const [limits, actions, emailCampaigns, suspended] = await Promise.all([
    admin.from("lead_usage_limits").select("*").order("plan"),
    admin.from("lead_admin_actions").select("*").order("created_at", { ascending: false }).limit(50),
    admin.from("lead_email_campaigns").select("user_id, sent, bounced").limit(5000),
    admin.from("lead_feature_access").select("user_id, suspended, suspended_reason, updated_at").eq("suspended", true).limit(200),
  ]);

  // Aggregate bounce rate per user; flag those above 5% (with a meaningful volume).
  const byUser = new Map<string, { sent: number; bounced: number }>();
  for (const c of emailCampaigns.data ?? []) {
    const uid = c.user_id as string | null;
    if (!uid) continue;
    const agg = byUser.get(uid) ?? { sent: 0, bounced: 0 };
    agg.sent += (c.sent as number) ?? 0;
    agg.bounced += (c.bounced as number) ?? 0;
    byUser.set(uid, agg);
  }
  const highBounceUsers = [...byUser.entries()]
    .filter(([, v]) => v.sent > 0 && v.bounced / v.sent > 0.05)
    .map(([userId, v]) => ({ userId, sent: v.sent, bounced: v.bounced, bounceRate: v.bounced / v.sent }))
    .sort((a, b) => b.bounceRate - a.bounceRate)
    .slice(0, 50);

  return NextResponse.json({
    limits: limits.data ?? [],
    recentActions: actions.data ?? [],
    highBounceUsers,
    suspendedUsers: suspended.data ?? [],
  });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "");

  const record = (targetUserId: string | null, detail: string) =>
    admin.from("lead_admin_actions").insert({
      admin_id: user.id,
      target_user_id: targetUserId,
      action,
      detail,
    }).then(() => {}, () => {});

  const now = new Date().toISOString();

  switch (action) {
    case "set_limits": {
      const plan = String(body.plan || "").trim();
      const accessLevel = String(body.access_level || "");
      const monthlyLeads = Number(body.monthly_leads);
      const dailySends = Number(body.daily_sends);
      const automatedSend = body.automated_send === true;
      if (!plan) return NextResponse.json({ error: "Missing plan." }, { status: 400 });
      if (!LEVELS.includes(accessLevel as AccessLevel))
        return NextResponse.json({ error: "Invalid access_level." }, { status: 400 });
      if (!Number.isFinite(monthlyLeads) || monthlyLeads < 0 || !Number.isFinite(dailySends) || dailySends < 0)
        return NextResponse.json({ error: "Limits must be non-negative numbers." }, { status: 400 });

      const { error } = await admin.from("lead_usage_limits").upsert(
        {
          plan,
          access_level: accessLevel,
          monthly_leads: Math.floor(monthlyLeads),
          daily_sends: Math.floor(dailySends),
          automated_send: automatedSend,
          updated_at: now,
        },
        { onConflict: "plan" }
      );
      if (error) return apiError(error.message, 500);
      await record(null, `set_limits ${plan}: level=${accessLevel} monthly=${Math.floor(monthlyLeads)} daily=${Math.floor(dailySends)} auto=${automatedSend}`);
      break;
    }

    case "suspend": {
      const userId = String(body.userId || "");
      const reason = typeof body.reason === "string" ? body.reason : null;
      if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });
      const { error } = await admin.from("lead_feature_access").upsert(
        { user_id: userId, suspended: true, suspended_reason: reason, updated_by: user.id, updated_at: now },
        { onConflict: "user_id" }
      );
      if (error) return apiError(error.message, 500);
      await record(userId, `suspend: ${reason ?? ""}`);
      break;
    }

    case "unsuspend": {
      const userId = String(body.userId || "");
      if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });
      const { error } = await admin.from("lead_feature_access").upsert(
        { user_id: userId, suspended: false, suspended_reason: null, updated_by: user.id, updated_at: now },
        { onConflict: "user_id" }
      );
      if (error) return apiError(error.message, 500);
      await record(userId, "unsuspend");
      break;
    }

    case "set_access": {
      const userId = String(body.userId || "");
      const level = body.level == null ? null : String(body.level);
      if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });
      if (level !== null && !LEVELS.includes(level as AccessLevel))
        return NextResponse.json({ error: "Invalid level." }, { status: 400 });
      const { error } = await admin.from("lead_feature_access").upsert(
        { user_id: userId, access_level_override: level, updated_by: user.id, updated_at: now },
        { onConflict: "user_id" }
      );
      if (error) return apiError(error.message, 500);
      await record(userId, `set_access: ${level ?? "plan-default"}`);
      break;
    }

    case "toggle": {
      const userId = String(body.userId || "");
      const enabled = body.enabled === true;
      if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });
      const { error } = await admin.from("lead_feature_access").upsert(
        { user_id: userId, enabled, updated_by: user.id, updated_at: now },
        { onConflict: "user_id" }
      );
      if (error) return apiError(error.message, 500);
      await record(userId, `toggle: ${enabled ? "enabled" : "disabled"}`);
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  // Return the refreshed state.
  const [limits, actions, suspended] = await Promise.all([
    admin.from("lead_usage_limits").select("*").order("plan"),
    admin.from("lead_admin_actions").select("*").order("created_at", { ascending: false }).limit(50),
    admin.from("lead_feature_access").select("user_id, suspended, suspended_reason, updated_at").eq("suspended", true).limit(200),
  ]);

  return NextResponse.json({
    ok: true,
    limits: limits.data ?? [],
    recentActions: actions.data ?? [],
    suspendedUsers: suspended.data ?? [],
  });
}
