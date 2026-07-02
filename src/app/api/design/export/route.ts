import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { DESIGN_CREDIT_COSTS, DESIGN_CREDIT_REASONS } from "@/lib/design/credits";
import type { ExportFormat } from "@/lib/design/types";

export const dynamic = "force-dynamic";

/**
 * GET  /api/design/export           -> the user's export history
 * POST /api/design/export           -> record an export + charge for PDF/MP4/GIF
 *      body: { projectId?, format, url?, width?, height?, bytes? }
 * PNG/JPG render fully client-side and are free; PDF/video conversions bill.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("design_exports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ exports: data });
}

function costFor(format: ExportFormat): number {
  if (format === "pdf") return DESIGN_CREDIT_COSTS.exportPdf;
  if (format === "mp4" || format === "gif") return DESIGN_CREDIT_COSTS.exportVideo;
  return DESIGN_CREDIT_COSTS.exportStandard;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{
    projectId?: string; format?: ExportFormat; url?: string; width?: number; height?: number; bytes?: number;
  }>(request);
  if (!body?.format) return apiError("format is required", 400);

  const cost = costFor(body.format);
  if (cost > 0) {
    const balance = await getCreditBalance();
    if (balance < cost) {
      return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
    }
    const reason = body.format === "pdf" ? DESIGN_CREDIT_REASONS.exportPdf : DESIGN_CREDIT_REASONS.exportVideo;
    const newBalance = await deductCredits(cost, reason);
    if (newBalance === null) return apiError("Insufficient credits", 402, { code: "insufficient_credits" });
  }

  const isVideo = body.format === "mp4" || body.format === "gif";
  const { data, error } = await supabase
    .from("design_exports")
    .insert({
      user_id: user.id, project_id: body.projectId ?? null, format: body.format,
      status: isVideo ? "processing" : "ready",   // video export architecture is a placeholder
      url: body.url ?? null, width: body.width ?? null, height: body.height ?? null,
      bytes: body.bytes ?? null, credits_used: cost,
    })
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);

  if (body.projectId) {
    await supabase.from("design_projects")
      .update({ status: "exported", updated_at: new Date().toISOString() })
      .eq("id", body.projectId).eq("user_id", user.id);
  }

  return NextResponse.json({ export: data, creditsUsed: cost });
}
