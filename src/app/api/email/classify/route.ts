import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { classifyEmail } from "@/lib/email-assistant/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/email/classify { messageId } — (re)classify a single message.
 * Free: single reclassifies are covered by the original scan charge.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ messageId?: string }>(request);
  if (!body?.messageId) return apiError("messageId is required", 400);

  const { data: msg } = await supabase
    .from("email_messages")
    .select("id, from_name, from_address, subject, snippet, body_text")
    .eq("id", body.messageId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!msg) return apiError("Message not found", 404);

  const { result, usedAI } = await classifyEmail({ fromName: msg.from_name, fromAddress: msg.from_address, subject: msg.subject, body: msg.body_text ?? msg.snippet });

  await supabase.from("email_classifications").upsert(
    {
      message_id: msg.id, user_id: user.id, category: result.category, priority: result.priority,
      summary: result.summary, needs_reply: result.needsReply, is_sensitive: result.isSensitive,
      deadline: result.deadline, used_ai: usedAI,
    },
    { onConflict: "message_id" }
  );
  if (result.attentionReason) {
    await supabase.from("email_attention_items").upsert(
      { message_id: msg.id, user_id: user.id, reason: result.attentionReason, suggested_action: result.suggestedAction, priority: result.priority, deadline: result.deadline },
      { onConflict: "message_id" }
    );
  }

  return NextResponse.json({ ok: true, classification: result, usedAI });
}
