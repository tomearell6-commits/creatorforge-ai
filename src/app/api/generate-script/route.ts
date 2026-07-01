import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateScript, willUseRealAI } from "@/lib/ai/generate";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { CREDITS_PER_SCRIPT } from "@/lib/constants";
import { apiError, readJsonBody } from "@/lib/api/respond";

/**
 * POST  /api/generate-script  -> generate a script (real Claude or placeholder).
 *                                Deducts credits for real generations.
 * PUT   /api/generate-script  -> save a generated script to a project.
 */

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJsonBody<{ category?: string; idea?: string; title?: string; tone?: string; length?: string }>(request);
  if (!body) return apiError("Invalid JSON body", 400);
  const { category, idea, title, tone, length } = body;
  if (!idea || !category) {
    return NextResponse.json({ error: "category and idea are required" }, { status: 400 });
  }

  // Pre-check the balance for real (paid) generations so we don't call the model
  // when the user can't afford it.
  const billableRun = willUseRealAI();
  if (billableRun) {
    const balance = await getCreditBalance();
    if (balance < CREDITS_PER_SCRIPT) {
      return NextResponse.json(
        {
          error: "Not enough credits. Upgrade your plan to keep generating.",
          code: "insufficient_credits",
        },
        { status: 402 }
      );
    }
  }

  let result;
  try {
    result = await generateScript({ category, idea, title, tone, length });
  } catch (err) {
    console.error("generateScript failed:", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 502 });
  }

  // Charge credits only after a successful real generation.
  let creditsRemaining: number | null = null;
  if (result.billable) {
    creditsRemaining = await deductCredits(CREDITS_PER_SCRIPT, "script_generation");
  }

  return NextResponse.json({
    content: result.content,
    model: result.model,
    tokensUsed: result.tokensUsed,
    billable: result.billable,
    creditsCharged: result.billable ? CREDITS_PER_SCRIPT : 0,
    creditsRemaining,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJsonBody<{ projectId?: string; content?: string; model?: string; tokensUsed?: number }>(request);
  if (!body) return apiError("Invalid JSON body", 400);
  const { projectId, content, model, tokensUsed } = body;
  if (!projectId || !content) {
    return NextResponse.json({ error: "projectId and content are required" }, { status: 400 });
  }

  // Confirm the user owns the project before writing.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { error } = await supabase.from("generated_scripts").insert({
    project_id: projectId,
    user_id: user.id,
    content,
    model: model ?? "creatorforge-placeholder-v1",
    tokens_used: typeof tokensUsed === "number" ? tokensUsed : 0,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("projects").update({ status: "ready" }).eq("id", projectId);

  return NextResponse.json({ ok: true });
}
