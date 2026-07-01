import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toolGenerate, willUseRealToolAI, isToolId, type ToolId } from "@/lib/tools/generate";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { apiError, readJsonBody } from "@/lib/api/respond";

/** AI text tools (hashtags, meta-titles). 1 credit when real AI is used. */
const COST = 1;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "tools-generate", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  const body = await readJsonBody<{ tool: ToolId; topic: string; platform?: string }>(request);
  if (!body) return apiError("Invalid JSON body", 400);
  const { tool, topic, platform } = body;
  if (!topic?.trim()) return NextResponse.json({ error: "Enter a topic or keyword." }, { status: 400 });
  if (!isToolId(tool)) return NextResponse.json({ error: "Unknown tool." }, { status: 400 });

  const billable = willUseRealToolAI();
  if (billable && (await getCreditBalance()) < COST) {
    return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits" }, { status: 402 });
  }

  const { output, usedAI } = await toolGenerate(tool, { topic: topic.trim(), platform });
  if (billable) await deductCredits(COST, `tool_${tool}`);

  return NextResponse.json({ output, usedAI });
}
