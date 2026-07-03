import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";

const FORMATS = ["png", "jpg", "pdf", "presentation", "storyboard", "prompt_package", "zip"] as const;
type Format = (typeof FORMATS)[number];

/** PDF/presentation conversion costs 1 credit (matches Design Studio); the
 *  rest are client-side packages and free. */
function costFor(format: Format): number {
  return format === "pdf" || format === "presentation" ? 1 : 0;
}

/**
 * GET  /api/design/realestate/export — export history.
 * POST /api/design/realestate/export — record an export { projectId?, format }.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("real_estate_exports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ exports: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ projectId?: string; format?: Format }>(request);
  if (!body?.format || !FORMATS.includes(body.format)) return apiError("A valid format is required", 400);

  const cost = costFor(body.format);
  if (cost > 0) {
    const balance = await getCreditBalance();
    if (balance < cost) {
      return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
    }
    const newBalance = await deductCredits(cost, "RE_EXPORT_PDF");
    if (newBalance === null) return apiError("Insufficient credits", 402, { code: "insufficient_credits" });
  }

  const { data, error } = await supabase
    .from("real_estate_exports")
    .insert({ user_id: user.id, project_id: body.projectId ?? null, format: body.format, credits_used: cost })
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);

  if (body.projectId) {
    await supabase.from("real_estate_projects")
      .update({ status: "exported", updated_at: new Date().toISOString() })
      .eq("id", body.projectId).eq("user_id", user.id);
  }

  return NextResponse.json({ export: data, creditsUsed: cost });
}
