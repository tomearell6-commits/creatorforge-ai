import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAssistantConfig, currentMonth, ASSISTANT_DEFAULTS } from "@/lib/assistant/config";

/** GET /api/assistant/free-allowance — this month's free message allowance + usage. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let cfg = ASSISTANT_DEFAULTS;
  try { cfg = await getAssistantConfig(createAdminClient()); } catch { /* defaults */ }

  const month = currentMonth();
  const [{ data: ovr }, { data: usage }] = await Promise.all([
    supabase.from("assistant_free_allowance").select("monthly_free").eq("user_id", user.id).maybeSingle(),
    supabase.from("assistant_usage").select("free_messages_used, paid_messages_used, credits_spent").eq("user_id", user.id).eq("month", month).maybeSingle(),
  ]);

  const limit = ovr?.monthly_free ?? cfg.free_messages;
  const used = usage?.free_messages_used ?? 0;
  return NextResponse.json({
    enabled: cfg.enabled, month, limit, used,
    remaining: Math.max(0, limit - used),
    paidMessages: usage?.paid_messages_used ?? 0,
    creditsSpent: usage?.credits_spent ?? 0,
    lowCreditThreshold: cfg.low_credit_threshold,
  });
}
