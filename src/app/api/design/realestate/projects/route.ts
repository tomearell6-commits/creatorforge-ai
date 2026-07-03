import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/**
 * Real estate projects CRUD (owner-scoped).
 * GET list · POST create · DELETE remove.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("real_estate_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ projects: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<Record<string, unknown>>(request);
  if (!body) return apiError("Invalid JSON body", 400);
  const projectName = typeof body.projectName === "string" && body.projectName.trim()
    ? body.projectName.trim()
    : "Untitled property project";

  const map: Record<string, string> = {
    projectType: "project_type", propertyType: "property_type", country: "country", city: "city",
    climate: "climate", plotSize: "plot_size", floors: "floors", bedrooms: "bedrooms",
    bathrooms: "bathrooms", designStyle: "design_style", budget: "budget", targetMarket: "target_market",
    interiorStyle: "interior_style", exteriorStyle: "exterior_style", roofStyle: "roof_style",
    materials: "materials", landscapePreference: "landscape_preference", brandName: "brand_name",
    outputType: "output_type",
  };
  const row: Record<string, unknown> = { user_id: user.id, project_name: projectName };
  for (const [k, col] of Object.entries(map)) if (body[k] !== undefined && body[k] !== "") row[col] = body[k];

  const { data, error } = await supabase
    .from("real_estate_projects")
    .insert(row)
    .select("*")
    .single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ project: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ id?: string }>(request);
  if (!body?.id) return apiError("id is required", 400);

  const { error } = await supabase
    .from("real_estate_projects")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ ok: true });
}
