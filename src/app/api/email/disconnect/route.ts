import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { deleteTokens } from "@/lib/email-assistant/tokens";

export const dynamic = "force-dynamic";

/**
 * POST /api/email/disconnect { accountId, deleteData? }
 * Always hard-deletes stored OAuth tokens. With deleteData, also removes all
 * synced messages/classifications/drafts/attention items (cascade via the
 * account delete); otherwise the account is marked disconnected and data kept
 * until the user chooses to delete it.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ accountId?: string; deleteData?: boolean }>(request);
  if (!body?.accountId) return apiError("accountId is required", 400);

  const { data: account } = await supabase
    .from("email_accounts")
    .select("id")
    .eq("id", body.accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) return apiError("Account not found", 404);

  // Tokens first — they must never survive a disconnect.
  await deleteTokens(createAdminClient(), account.id);

  if (body.deleteData) {
    await supabase.from("email_accounts").delete().eq("id", account.id).eq("user_id", user.id); // cascades
    await supabase.from("email_activity_logs").insert({ user_id: user.id, account_id: account.id, action: "delete_data", detail: "account + all email data deleted" });
  } else {
    await supabase.from("email_accounts").update({ status: "disconnected", updated_at: new Date().toISOString() }).eq("id", account.id);
    await supabase.from("email_activity_logs").insert({ user_id: user.id, account_id: account.id, action: "disconnect", detail: "tokens deleted, data kept" });
  }

  return NextResponse.json({ ok: true, dataDeleted: !!body.deleteData });
}
