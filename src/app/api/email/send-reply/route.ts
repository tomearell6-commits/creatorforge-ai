import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { sendReply, providerFamily, type EmailProviderId } from "@/lib/email-assistant/providers";
import { getAccessToken } from "@/lib/email-assistant/tokens";
import { canSend, isSensitiveEmail, type PermissionMode } from "@/lib/email-assistant/safety";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/email/send-reply { draftId, confirmSensitive? }
 *
 * SERVER-ENFORCED SAFETY: the user clicking send IS the manual approval, but
 * Read & Summarize accounts can never send, and sensitive emails additionally
 * require confirmSensitive:true (the UI shows a confirmation dialog). Demo
 * accounts simulate the send (no network) so the flow is testable.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ draftId?: string; confirmSensitive?: boolean }>(request);
  if (!body?.draftId) return apiError("draftId is required", 400);

  const { data: draft } = await supabase
    .from("email_draft_replies")
    .select("id, draft_text, status, message_id, email_messages(id, account_id, thread_id, from_address, subject, body_text, snippet)")
    .eq("id", body.draftId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!draft) return apiError("Draft not found", 404);
  if (draft.status === "sent") return apiError("This draft was already sent.", 400);

  const msg = Array.isArray(draft.email_messages) ? draft.email_messages[0] : draft.email_messages;
  if (!msg?.from_address) return apiError("Original message has no reply address.", 400);

  const { data: account } = await supabase
    .from("email_accounts")
    .select("id, provider, permission_mode, status")
    .eq("id", msg.account_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account || account.status === "disconnected") return apiError("Account is not connected.", 400);

  // Safety gates (server-side, cannot be bypassed by the client).
  const { data: cls } = await supabase.from("email_classifications").select("category, is_sensitive").eq("message_id", msg.id).maybeSingle();
  const sensitive = cls?.is_sensitive || isSensitiveEmail({ subject: msg.subject, body: msg.body_text ?? msg.snippet, category: cls?.category });
  const gate = canSend({ mode: account.permission_mode as PermissionMode, manualApproval: true, sensitive });
  if (!gate.allowed) return apiError(gate.reason, 403);
  if (sensitive && body.confirmSensitive !== true) {
    return apiError("This email touches a sensitive topic (legal/billing/security). Confirm to send.", 409, { code: "confirm_required" });
  }

  // Send.
  try {
    if (account.provider !== "demo") {
      const family = providerFamily(account.provider as EmailProviderId);
      if (family !== "google" && family !== "microsoft") return apiError("Provider cannot send.", 400);
      const token = await getAccessToken(createAdminClient(), account.id, family);
      await sendReply(family, token, {
        to: msg.from_address, subject: msg.subject ?? "(no subject)",
        body: draft.draft_text, threadId: msg.thread_id ?? undefined,
      });
    }
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Send failed", 502);
  }

  await supabase.from("email_draft_replies")
    .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", draft.id).eq("user_id", user.id);
  await supabase.from("email_attention_items")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("message_id", msg.id).eq("user_id", user.id);
  await supabase.from("email_activity_logs").insert({
    user_id: user.id, account_id: account.id, action: "send",
    detail: `${account.provider === "demo" ? "[demo simulated] " : ""}to ${msg.from_address}${sensitive ? " (sensitive, user-confirmed)" : ""}`,
  });

  return NextResponse.json({ ok: true, simulated: account.provider === "demo" });
}
