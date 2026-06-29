import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAssistantConfig, currentMonth, ASSISTANT_DEFAULTS } from "@/lib/assistant/config";
import { estimate } from "@/lib/assistant/cost";
import { willUseRealAssistantAI } from "@/lib/assistant/prompt";

/** POST /api/assistant/estimate-cost { message } — tier + cost + whether it's free. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = (await request.json().catch(() => ({}))) as { message?: string };
  if (!message?.trim()) return NextResponse.json({ error: "Empty message." }, { status: 400 });

  let cfg = ASSISTANT_DEFAULTS;
  try { cfg = await getAssistantConfig(createAdminClient()); } catch { /* defaults */ }
  const realAI = willUseRealAssistantAI();

  const month = currentMonth();
  const [{ data: ovr }, { data: usage }] = await Promise.all([
    supabase.from("assistant_free_allowance").select("monthly_free").eq("user_id", user.id).maybeSingle(),
    supabase.from("assistant_usage").select("free_messages_used").eq("user_id", user.id).eq("month", month).maybeSingle(),
  ]);
  const limit = ovr?.monthly_free ?? cfg.free_messages;
  const freeRemaining = Math.max(0, limit - (usage?.free_messages_used ?? 0));

  const { tier, credits } = estimate(message, cfg);
  // Placeholder mode is always free; real AI uses free allowance then credits.
  const willCharge = realAI && freeRemaining <= 0;
  return NextResponse.json({ tier, credits: willCharge ? credits : 0, fullCost: credits, freeRemaining, willCharge, realAI });
}
