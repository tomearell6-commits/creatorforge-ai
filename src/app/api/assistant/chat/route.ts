import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { getAssistantConfig, currentMonth, ASSISTANT_DEFAULTS } from "@/lib/assistant/config";
import { estimate } from "@/lib/assistant/cost";
import { askAssistant, willUseRealAssistantAI, type ChatTurn } from "@/lib/assistant/prompt";
import { captureError } from "@/lib/logger";

const LEDGER_REASON = "AI_ASSISTANT_MESSAGE";
const MAX_LEN = 2000;

/**
 * POST /api/assistant/chat { message, conversationId?, page?, category? }
 * Free allowance first, then credits per reply (server-side). Credits are
 * deducted ONLY after a successful reply. Placeholder replies (no AI key) are
 * always free and never consume the allowance.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "assistant-chat", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "You're sending messages too fast. Please wait a moment." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { message?: string; conversationId?: string; page?: string; category?: string };
  const message = (body.message ?? "").trim().slice(0, MAX_LEN);
  if (!message) return NextResponse.json({ error: "Please enter a message." }, { status: 400 });

  // Config via admin client (system_settings is admin-only); defaults if unavailable.
  let admin: ReturnType<typeof createAdminClient> | null = null;
  try { admin = createAdminClient(); } catch { admin = null; }
  const cfg = admin ? await getAssistantConfig(admin) : ASSISTANT_DEFAULTS;
  if (!cfg.enabled) return NextResponse.json({ error: "The assistant is currently disabled." }, { status: 403 });

  const realAI = willUseRealAssistantAI();
  const { tier, credits: tierCost } = estimate(message, cfg);

  // Context (no sensitive data).
  const { data: profile } = await supabase.from("profiles").select("plan, credits").eq("user_id", user.id).single();
  const plan = profile?.plan ?? "free";
  const balance = profile?.credits ?? 0;

  // ---- Billing gate (only when real AI is used) ----
  const month = currentMonth();
  let willCharge = false;
  let freeRemaining = cfg.free_messages;

  if (realAI) {
    const { data: ovr } = await supabase.from("assistant_free_allowance").select("monthly_free").eq("user_id", user.id).maybeSingle();
    const freeLimit = ovr?.monthly_free ?? cfg.free_messages;
    const { data: usage } = await supabase.from("assistant_usage").select("free_messages_used").eq("user_id", user.id).eq("month", month).maybeSingle();
    const used = usage?.free_messages_used ?? 0;
    freeRemaining = Math.max(0, freeLimit - used);

    if (freeRemaining <= 0) {
      willCharge = true;
      if (balance < tierCost) {
        return NextResponse.json({
          error: "You need more credits to continue chatting with Forge AI Assistant.",
          code: "insufficient_credits", needed: tierCost, balance,
        }, { status: 402 });
      }
    }
  }

  // ---- Conversation + persist user message ----
  let conversationId = body.conversationId ?? null;
  if (conversationId) {
    const { data: conv } = await supabase.from("assistant_conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
    if (!conv) conversationId = null; // not theirs / missing → start fresh
  }
  if (!conversationId) {
    const { data: conv } = await supabase.from("assistant_conversations")
      .insert({ user_id: user.id, title: message.slice(0, 60) }).select("id").single();
    conversationId = conv?.id ?? null;
  }
  if (!conversationId) return NextResponse.json({ error: "Could not start a conversation." }, { status: 500 });

  await supabase.from("assistant_messages").insert({ conversation_id: conversationId, user_id: user.id, role: "user", message, credit_cost: 0, status: "ok" });

  // Recent history for context.
  const { data: hist } = await supabase.from("assistant_messages")
    .select("role, message").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(16);
  const history: ChatTurn[] = (hist ?? []).map((h) => ({ role: h.role as "user" | "assistant", content: h.message }));

  // ---- Generate reply ----
  let reply: string;
  try {
    reply = await askAssistant(history, message, { page: body.page, plan, credits: balance, category: body.category });
  } catch (e) {
    captureError(e, { category: "api", feature: "assistant", stage: "generate" });
    await supabase.from("assistant_messages").insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", message: "", credit_cost: 0, status: "failed" });
    return NextResponse.json({ error: "The assistant couldn't respond just now. No credits were charged — please try again.", conversationId }, { status: 502 });
  }

  // ---- Charge AFTER success ----
  let creditCost = 0;
  let charged = false;
  if (realAI) {
    if (willCharge) {
      const newBal = await deductCredits(tierCost, LEDGER_REASON);
      if (newBal !== null) { creditCost = tierCost; charged = true; if (admin) await admin.rpc("assistant_record_paid", { p_user: user.id, p_month: month, p_credits: tierCost }); }
    } else {
      // Free message — consume one atomically.
      await supabase.rpc("assistant_consume_free", { p_user: user.id, p_month: month, p_limit: (await freeLimitFor(supabase, user.id, cfg.free_messages)) });
      freeRemaining = Math.max(0, freeRemaining - 1);
    }
  }

  await supabase.from("assistant_messages").insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", message: reply, credit_cost: creditCost, status: "ok" });
  await supabase.from("assistant_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  const creditsRemaining = charged ? Math.max(0, balance - creditCost) : balance;
  return NextResponse.json({ conversationId, reply, creditCost, charged, free: realAI && !willCharge, freeRemaining, creditsRemaining, tier, realAI });
}

async function freeLimitFor(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, fallback: number): Promise<number> {
  const { data } = await supabase.from("assistant_free_allowance").select("monthly_free").eq("user_id", userId).maybeSingle();
  return data?.monthly_free ?? fallback;
}
