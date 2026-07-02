import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { generateFootageConcept, willUseRealFootageAI } from "@/lib/design/footage";
import { DESIGN_CREDIT_COSTS, DESIGN_CREDIT_REASONS } from "@/lib/design/credits";
import type { FootageInput } from "@/lib/design/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET  /api/design/footage           -> list the user's saved footage concepts
 * POST /api/design/footage           -> generate a live AI footage concept
 * Charges DESIGN_CREDIT_COSTS.footage only when real AI runs and succeeds.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("video_graphic_concepts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ concepts: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<FootageInput & { projectId?: string }>(request);
  if (!body?.sceneIdea) return apiError("sceneIdea is required", 400);

  const cost = DESIGN_CREDIT_COSTS.footage;
  const billable = willUseRealFootageAI();
  if (billable) {
    const balance = await getCreditBalance();
    if (balance < cost) {
      return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
    }
  }

  const { concept, usedAI } = await generateFootageConcept(body);

  let creditsUsed = 0;
  if (usedAI && cost > 0) {
    const newBalance = await deductCredits(cost, DESIGN_CREDIT_REASONS.footage);
    if (newBalance === null) return apiError("Insufficient credits", 402, { code: "insufficient_credits" });
    creditsUsed = cost;
  }

  const { data: saved, error } = await supabase
    .from("video_graphic_concepts")
    .insert({
      user_id: user.id, project_id: body.projectId ?? null,
      title: concept.title, scene_idea: body.sceneIdea, subject: body.subject ?? null,
      camera_style: body.cameraStyle ?? null, lighting: body.lighting ?? null, background: body.background ?? null,
      motion_style: body.motionStyle ?? null, platform: body.platform ?? null,
      duration: body.duration ?? null, aspect_ratio: body.aspectRatio ?? null,
      concept_json: concept, credits_used: creditsUsed,
    })
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);

  return NextResponse.json({ concept: saved, usedAI, creditsUsed });
}
