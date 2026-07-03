import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { draftReply, willUseRealEmailAI } from "@/lib/email-assistant/ai";
import { modeAllows, EMAIL_CREDIT_COSTS, EMAIL_CREDIT_REASONS, type DraftTone, type PermissionMode } from "@/lib/email-assistant/safety";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET  /api/email/draft-reply?message=|status= — the user's drafts.
 * POST /api/email/draft-reply { messageId, tone } — generate an AI draft
 *      (2 credits when real AI runs; blocked in Read & Summarize mode).
 * PATCH { draftId, draftText?, status? } — edit / approve / reject a draft.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  let query = supabase
    .from("email_draft_replies")
    .select("*, email_messages(from_name, from_address, subject, snippet, account_id, thread_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const message = searchParams.get("message");
  const status = searchParams.get("status");
  if (message) query = query.eq("message_id", message);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ drafts: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ messageId?: string; tone?: DraftTone }>(request);
  if (!body?.messageId) return apiError("messageId is required", 400);
  const tone: DraftTone = body.tone ?? "professional";

  const { data: msg } = await supabase
    .from("email_messages")
    .select("id, account_id, from_name, from_address, subject, snippet, body_text, email_accounts(permission_mode)")
    .eq("id", body.messageId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!msg) return apiError("Message not found", 404);

  const acct = Array.isArray(msg.email_accounts) ? msg.email_accounts[0] : msg.email_accounts;
  const mode = (acct?.permission_mode ?? "draft_assistant") as PermissionMode;
  if (!modeAllows(mode, "draft")) {
    return apiError("This account is in Read & Summarize mode — drafting is disabled in its settings.", 403);
  }

  const cost = EMAIL_CREDIT_COSTS.draftReply;
  const billable = willUseRealEmailAI();
  if (billable) {
    const balance = await getCreditBalance();
    if (balance < cost) return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
  }

  const { draft, usedAI } = await draftReply(
    { fromName: msg.from_name, fromAddress: msg.from_address, subject: msg.subject, body: msg.body_text ?? msg.snippet },
    tone
  );

  let creditsUsed = 0;
  if (usedAI && cost > 0) {
    const newBalance = await deductCredits(cost, EMAIL_CREDIT_REASONS.draft);
    if (newBalance !== null) creditsUsed = cost;
  }

  const { data: saved, error } = await supabase
    .from("email_draft_replies")
    .insert({ message_id: msg.id, user_id: user.id, tone, draft_text: draft, used_ai: usedAI, credits_used: creditsUsed })
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);

  await supabase.from("email_activity_logs").insert({ user_id: user.id, account_id: msg.account_id, action: "draft", detail: `tone=${tone}` });
  return NextResponse.json({ draft: saved, usedAI, creditsUsed });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ draftId?: string; draftText?: string; status?: string }>(request);
  if (!body?.draftId) return apiError("draftId is required", 400);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.draftText !== undefined) { patch.draft_text = body.draftText; patch.status = "edited"; }
  if (body.status && ["approved", "rejected", "suggested"].includes(body.status)) patch.status = body.status;

  const { data, error } = await supabase
    .from("email_draft_replies")
    .update(patch)
    .eq("id", body.draftId)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ draft: data });
}
