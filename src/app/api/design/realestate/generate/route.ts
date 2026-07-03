import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { generateRealEstateConcept, willUseRealEstateAI, type RealEstateInput } from "@/lib/design/realestate";
import { getReOutputType } from "@/config/industrySuites";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/design/realestate/generate — structured real-estate concept.
 * Credits = per output type (RE_OUTPUT_TYPES). Charged ONLY when real AI runs
 * and succeeds; 402 pre-check before any work. Saves the output + updates the
 * project when projectId is supplied.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<RealEstateInput & { projectId?: string }>(request);
  if (!body) return apiError("Invalid JSON body", 400);
  if (!body.projectName?.trim()) return apiError("projectName is required", 400);
  if (!body.outputType) return apiError("outputType is required", 400);

  const outputType = getReOutputType(body.outputType);
  const cost = outputType.credits;
  const billable = willUseRealEstateAI();

  if (billable) {
    const balance = await getCreditBalance();
    if (balance < cost) {
      return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
    }
  }

  const { concept, usedAI } = await generateRealEstateConcept({ ...body, outputType: outputType.id });

  let creditsUsed = 0;
  if (usedAI && cost > 0) {
    const newBalance = await deductCredits(cost, `RE_${outputType.id.toUpperCase()}`);
    if (newBalance === null) return apiError("Insufficient credits", 402, { code: "insufficient_credits" });
    creditsUsed = cost;
  }

  // Persist output; verify project ownership before touching it.
  let projectId = body.projectId ?? null;
  if (projectId) {
    const { data: proj } = await supabase
      .from("real_estate_projects").select("id, credits_used")
      .eq("id", projectId).eq("user_id", user.id).maybeSingle();
    if (!proj) {
      projectId = null;
    } else {
      await supabase.from("real_estate_projects")
        .update({ status: "generated", credits_used: (proj.credits_used ?? 0) + creditsUsed, updated_at: new Date().toISOString() })
        .eq("id", proj.id).eq("user_id", user.id);
    }
  }

  const { data: output, error } = await supabase
    .from("real_estate_design_outputs")
    .insert({
      user_id: user.id, project_id: projectId, output_type: outputType.id,
      concept_json: concept, used_ai: usedAI, credits_used: creditsUsed,
    })
    .select("id, created_at")
    .single();
  if (error && projectId) return apiError(error.message, 500);

  return NextResponse.json({ concept, usedAI, creditsUsed, outputId: output?.id ?? null });
}
