import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { PERMISSION_MODES } from "@/lib/email-assistant/safety";

export const dynamic = "force-dynamic";

/** PATCH { accountId, permissionMode?, dailySummary?, notifyCritical? } — owner-scoped account prefs. */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ accountId?: string; permissionMode?: string; dailySummary?: boolean; notifyCritical?: boolean }>(request);
  if (!body?.accountId) return apiError("accountId is required", 400);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.permissionMode !== undefined) {
    if (!PERMISSION_MODES.some((m) => m.id === body.permissionMode)) return apiError("Invalid permission mode", 400);
    patch.permission_mode = body.permissionMode;
  }
  if (body.dailySummary !== undefined) patch.daily_summary = body.dailySummary;
  if (body.notifyCritical !== undefined) patch.notify_critical = body.notifyCritical;

  const { data, error } = await supabase
    .from("email_accounts")
    .update(patch)
    .eq("id", body.accountId)
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error) return apiError(error.message, 500);

  await supabase.from("email_activity_logs").insert({ user_id: user.id, account_id: data.id, action: "settings", detail: JSON.stringify(Object.keys(patch)) });
  return NextResponse.json({ ok: true });
}
