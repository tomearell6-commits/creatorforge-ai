import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { generateWalkthroughConcept, willUseRealEstateAI, type WalkthroughInput } from "@/lib/design/realestate";
import { getReOutputType } from "@/config/industrySuites";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * AI Property Walkthrough Designer.
 * GET  — the user's saved walkthrough concepts.
 * POST — generate + save a walkthrough concept (credit-gated like all RE gen).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("real_estate_walkthroughs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ walkthroughs: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<WalkthroughInput & { projectId?: string }>(request);
  if (!body?.propertyType) return apiError("propertyType is required", 400);

  const cost = getReOutputType("walkthrough").credits;
  const billable = willUseRealEstateAI();
  if (billable) {
    const balance = await getCreditBalance();
    if (balance < cost) {
      return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
    }
  }

  const { concept, usedAI } = await generateWalkthroughConcept(body);

  let creditsUsed = 0;
  if (usedAI && cost > 0) {
    const newBalance = await deductCredits(cost, "RE_WALKTHROUGH");
    if (newBalance === null) return apiError("Insufficient credits", 402, { code: "insufficient_credits" });
    creditsUsed = cost;
  }

  const { data: saved, error } = await supabase
    .from("real_estate_walkthroughs")
    .insert({
      user_id: user.id, project_id: body.projectId ?? null, title: concept.title,
      property_type: body.propertyType, features: body.features ?? null,
      camera_style: body.cameraStyle ?? null, lighting_style: body.lightingStyle ?? null,
      music_style: body.musicStyle ?? null, voiceover_style: body.voiceoverStyle ?? null,
      duration: body.duration ?? null, aspect_ratio: body.aspectRatio ?? null,
      platform: body.platform ?? null, concept_json: concept, credits_used: creditsUsed,
    })
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);

  return NextResponse.json({ walkthrough: saved, concept, usedAI, creditsUsed });
}
