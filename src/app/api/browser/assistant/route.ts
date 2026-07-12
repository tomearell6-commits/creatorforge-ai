import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { askWebsiteAssistant, willUseRealAssistant } from "@/lib/browser/assistant";
import { apiError } from "@/lib/api/respond";
import type { AssistantAction } from "@/lib/browser/types";

export const maxDuration = 60;

const COST = 2; // credits per real-AI answer

/** POST { context, action? | question? } — AI Website Assistant. Charges COST
 *  only when real AI runs and succeeds (402 pre-check); placeholder is free. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "browser-assistant", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { context?: string; action?: AssistantAction; question?: string };
  if (!body.context) return apiError("Inspect a page first.", 400);
  if (!body.action && !body.question) return apiError("Ask a question or pick an action.", 400);

  const billable = willUseRealAssistant();
  if (billable && (await getCreditBalance()) < COST) {
    return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits" }, { status: 402 });
  }

  const { answer, usedAI } = await askWebsiteAssistant({ context: body.context, action: body.action, question: body.question });
  if (usedAI) await deductCredits(COST, "browser_assistant");

  return NextResponse.json({ answer, usedAI, charged: usedAI ? COST : 0 });
}
