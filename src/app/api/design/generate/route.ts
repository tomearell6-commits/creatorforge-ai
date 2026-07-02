import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { generateDesignConcept, willUseRealDesignAI } from "@/lib/design/generate";
import { DESIGN_CREDIT_COSTS, DESIGN_CREDIT_REASONS } from "@/lib/design/credits";
import { getDesignCategoryBySlug, getDesignFormat } from "@/config/designStudio";
import type { DesignConceptInput } from "@/lib/design/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/design/generate — generate a structured AI design concept.
 * Charges credits ONLY when real AI runs and succeeds (placeholder = free).
 * Pre-checks the balance and returns 402 before doing any work.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{
    projectId?: string; category?: string; format?: string; goal?: string; style?: string;
    width?: number; height?: number; brandKitId?: string;
  }>(request);
  if (!body) return apiError("Invalid JSON body", 400);
  if (!body.category || !body.goal) return apiError("category and goal are required", 400);

  const cat = getDesignCategoryBySlug(body.category);
  const cost = cat?.credits ?? DESIGN_CREDIT_COSTS.concept;
  const billable = willUseRealDesignAI();

  if (billable) {
    const balance = await getCreditBalance();
    if (balance < cost) {
      return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
    }
  }

  // Optional brand kit context.
  let brand: DesignConceptInput["brand"];
  if (body.brandKitId) {
    const { data: kit } = await supabase
      .from("brand_design_kits")
      .select("name, colors, fonts, tone, brand_description")
      .eq("id", body.brandKitId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (kit) brand = { name: kit.name, colors: kit.colors, fonts: kit.fonts, tone: kit.tone, description: kit.brand_description };
  }

  const fmt = getDesignFormat(body.format || cat?.format || "square-1-1");
  const input: DesignConceptInput = {
    category: body.category,
    format: fmt.id,
    width: body.width ?? fmt.width,
    height: body.height ?? fmt.height,
    goal: body.goal,
    style: body.style || "minimal",
    brand,
  };

  const { concept, usedAI } = await generateDesignConcept(input);

  let creditsUsed = 0;
  if (usedAI && cost > 0) {
    const newBalance = await deductCredits(cost, DESIGN_CREDIT_REASONS.concept);
    if (newBalance === null) return apiError("Insufficient credits", 402, { code: "insufficient_credits" });
    creditsUsed = cost;
  }

  // Persist the concept onto the project + a generation-job record.
  if (body.projectId) {
    await supabase.from("design_projects")
      .update({ concept_json: concept, status: "generated", credits_used: creditsUsed, updated_at: new Date().toISOString() })
      .eq("id", body.projectId).eq("user_id", user.id);
  }
  await supabase.from("design_generation_jobs").insert({
    user_id: user.id, project_id: body.projectId ?? null, job_type: "concept",
    status: "completed", input_json: input, output_json: concept, used_ai: usedAI, credits_used: creditsUsed,
  });

  return NextResponse.json({ concept, usedAI, creditsUsed });
}
