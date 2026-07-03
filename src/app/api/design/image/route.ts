import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { generateDesignImage, willUseRealDesignImages } from "@/lib/design/image";
import { DESIGN_CREDIT_COSTS, DESIGN_CREDIT_REASONS } from "@/lib/design/credits";
import { uploadFromUrl } from "@/lib/media/storage";
import { rateLimitAsync } from "@/lib/security/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PROMPT = 2000;

/**
 * POST /api/design/image — render an AI image (fal.ai FLUX) from a prompt.
 * body: { prompt, width?, height?, projectId?, kind?, name? }
 *
 * Charges DESIGN_CREDIT_COSTS.aiImage ONLY when real AI runs and succeeds
 * (402 pre-check first; placeholder mode is free). The provider URL is
 * rehosted to Supabase Storage so it never expires, and registered in
 * design_assets for reuse across designs.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const rl = await rateLimitAsync(`design-image:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return apiError("Too many image requests — try again in a minute.", 429);

  const body = await readJsonBody<{
    prompt?: string; width?: number; height?: number;
    projectId?: string; kind?: string; name?: string;
  }>(request);
  if (!body?.prompt?.trim()) return apiError("prompt is required", 400);
  const prompt = body.prompt.trim().slice(0, MAX_PROMPT);
  const width = typeof body.width === "number" ? body.width : 1344;
  const height = typeof body.height === "number" ? body.height : 768;

  const cost = DESIGN_CREDIT_COSTS.aiImage;
  const billable = willUseRealDesignImages();
  if (billable) {
    const balance = await getCreditBalance();
    if (balance < cost) {
      return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
    }
  }

  // 1. Generate (throws on provider failure — nothing charged).
  let generated;
  try {
    generated = await generateDesignImage(prompt, { width, height });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Image generation failed", 502);
  }

  // 2. Rehost to Supabase Storage so the image persists (fal URLs are temporary).
  let finalUrl = generated.url;
  let storagePath: string | null = null;
  try {
    const uploaded = await uploadFromUrl(supabase, {
      userId: user.id, type: "design", sourceUrl: generated.url, ext: "jpg",
    });
    finalUrl = uploaded.url;
    storagePath = uploaded.path;
  } catch {
    // Keep the provider URL as a fallback rather than failing the whole request.
  }

  // 3. Charge only after a real-AI success.
  let creditsUsed = 0;
  if (generated.usedAI && cost > 0) {
    const newBalance = await deductCredits(cost, DESIGN_CREDIT_REASONS.aiImage);
    if (newBalance === null) return apiError("Insufficient credits", 402, { code: "insufficient_credits" });
    creditsUsed = cost;
  }

  // 4. Register in the design asset library + generation-job telemetry.
  const { data: asset } = await supabase
    .from("design_assets")
    .insert({
      user_id: user.id, project_id: body.projectId ?? null, url: finalUrl,
      asset_type: body.kind === "background" ? "background" : "image",
      name: body.name ?? prompt.slice(0, 80), prompt, source: "ai",
      mime_type: "image/jpeg", width: generated.width, height: generated.height,
      metadata: storagePath ? { path: storagePath, model: generated.model } : { model: generated.model },
    })
    .select("id")
    .single();

  await supabase.from("design_generation_jobs").insert({
    user_id: user.id, project_id: body.projectId ?? null, job_type: "image",
    status: "completed", input_json: { prompt, width, height, kind: body.kind ?? "image" },
    output_json: { url: finalUrl, model: generated.model },
    used_ai: generated.usedAI, credits_used: creditsUsed,
  });

  return NextResponse.json({
    url: finalUrl, width: generated.width, height: generated.height,
    usedAI: generated.usedAI, creditsUsed, assetId: asset?.id ?? null, model: generated.model,
  });
}
