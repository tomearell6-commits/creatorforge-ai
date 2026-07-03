import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { EMAIL_CATEGORIES, SENSITIVE_CATEGORIES, type EmailCategory } from "@/lib/email-assistant/safety";

export const dynamic = "force-dynamic";

const SAFE_ACTIONS = ["draft_reply", "alert", "label", "follow_up"] as const;

/**
 * Automation rules — SAFE actions only (draft/alert/label/follow-up).
 * Rules never auto-send by themselves; sending remains gated by the account's
 * permission mode + the sensitive-topic blocklist in /api/email/send-reply.
 * Rules on sensitive categories (billing) may alert/label but never draft.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("email_automation_rules")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ name?: string; triggerCategory?: EmailCategory; action?: string; tone?: string; accountId?: string }>(request);
  if (!body?.name || !body.triggerCategory || !body.action) return apiError("name, triggerCategory and action are required", 400);
  if (!SAFE_ACTIONS.includes(body.action as (typeof SAFE_ACTIONS)[number])) return apiError("Unsupported action.", 400);
  if (!EMAIL_CATEGORIES.some((c) => c.id === body.triggerCategory)) return apiError("Unknown category.", 400);
  if (SENSITIVE_CATEGORIES.includes(body.triggerCategory) && body.action === "draft_reply") {
    return apiError("Automated drafting is blocked for sensitive categories (billing/legal). Use an alert rule instead.", 400);
  }

  const { data, error } = await supabase
    .from("email_automation_rules")
    .insert({
      user_id: user.id, account_id: body.accountId ?? null, name: body.name,
      trigger_category: body.triggerCategory, action: body.action, tone: body.tone ?? "professional",
    })
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ rule: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ id?: string; isActive?: boolean }>(request);
  if (!body?.id) return apiError("id is required", 400);

  const { data, error } = await supabase
    .from("email_automation_rules")
    .update({ is_active: body.isActive ?? true })
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ rule: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ id?: string }>(request);
  if (!body?.id) return apiError("id is required", 400);

  const { error } = await supabase.from("email_automation_rules").delete().eq("id", body.id).eq("user_id", user.id);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ ok: true });
}
