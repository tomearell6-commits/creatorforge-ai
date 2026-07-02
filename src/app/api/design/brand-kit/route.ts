import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/**
 * Brand design kits — reusable logo/colors/fonts/tone applied to any design.
 * GET list / POST create / PATCH update / DELETE, all owner-scoped.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("brand_design_kits")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ kits: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{
    name?: string; logoUrl?: string; colors?: string[]; fonts?: string[];
    tone?: string; brandDescription?: string; imageStyle?: string; ctaStyle?: string; isDefault?: boolean;
  }>(request);
  if (!body) return apiError("Invalid JSON body", 400);

  // Only one default kit at a time.
  if (body.isDefault) {
    await supabase.from("brand_design_kits").update({ is_default: false }).eq("user_id", user.id);
  }

  const { data, error } = await supabase
    .from("brand_design_kits")
    .insert({
      user_id: user.id, name: body.name?.trim() || "My Brand Kit", logo_url: body.logoUrl ?? null,
      colors: body.colors ?? [], fonts: body.fonts ?? [], tone: body.tone ?? null,
      brand_description: body.brandDescription ?? null, image_style: body.imageStyle ?? null,
      cta_style: body.ctaStyle ?? null, is_default: body.isDefault ?? false,
    })
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ kit: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ id?: string; isDefault?: boolean; [k: string]: unknown }>(request);
  if (!body?.id) return apiError("id is required", 400);

  if (body.isDefault) {
    await supabase.from("brand_design_kits").update({ is_default: false }).eq("user_id", user.id);
  }

  const map: Record<string, string> = {
    name: "name", logoUrl: "logo_url", colors: "colors", fonts: "fonts", tone: "tone",
    brandDescription: "brand_description", imageStyle: "image_style", ctaStyle: "cta_style", isDefault: "is_default",
  };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, col] of Object.entries(map)) if (k in body) patch[col] = body[k];

  const { data, error } = await supabase
    .from("brand_design_kits")
    .update(patch)
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ kit: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ id?: string }>(request);
  if (!body?.id) return apiError("id is required", 400);

  const { error } = await supabase.from("brand_design_kits").delete().eq("id", body.id).eq("user_id", user.id);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ ok: true });
}
