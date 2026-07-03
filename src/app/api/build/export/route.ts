import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { BUILD_CREDIT_COSTS, BUILD_CREDIT_REASONS } from "@/config/buildStudio";

export const dynamic = "force-dynamic";

const FORMATS = ["pdf", "docx", "markdown", "copy_package", "sitemap", "wireframe", "schema", "marketing", "prompt_package"] as const;
type Format = (typeof FORMATS)[number];

/**
 * GET  — export history. POST { projectId?, format } — record an export.
 * Markdown/copy/prompt packages render client-side (free); PDF costs 1 credit.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("build_project_exports").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(50);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ exports: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ projectId?: string; format?: Format }>(request);
  if (!body?.format || !FORMATS.includes(body.format)) return apiError("A valid format is required", 400);

  const cost = body.format === "pdf" || body.format === "docx" ? BUILD_CREDIT_COSTS.exportPdf : 0;
  if (cost > 0) {
    const balance = await getCreditBalance();
    if (balance < cost) return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
    const nb = await deductCredits(cost, BUILD_CREDIT_REASONS.exportPdf);
    if (nb === null) return apiError("Insufficient credits", 402, { code: "insufficient_credits" });
  }

  const { data, error } = await supabase
    .from("build_project_exports")
    .insert({ user_id: user.id, project_id: body.projectId ?? null, format: body.format, credits_used: cost })
    .select("*").single();
  if (error) return apiError(error.message, 500);

  if (body.projectId) {
    await supabase.from("build_projects").update({ status: "exported", updated_at: new Date().toISOString() })
      .eq("id", body.projectId).eq("user_id", user.id);
  }
  return NextResponse.json({ export: data, creditsUsed: cost });
}
