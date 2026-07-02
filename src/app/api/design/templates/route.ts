import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/respond";
import { DESIGN_TEMPLATES } from "@/config/designTemplates";

export const dynamic = "force-dynamic";

/**
 * GET /api/design/templates?category=&format=&style= -> combined template list.
 * Merges the shipped starter catalogue (config) with any admin-added rows in
 * the world-readable design_templates table.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const format = searchParams.get("format");
  const style = searchParams.get("style");

  // Config templates (always available).
  const config = DESIGN_TEMPLATES.map((t) => ({
    id: t.id, name: t.name, category: t.category, group: t.group, format: t.format,
    width: t.width, height: t.height, previewUrl: t.previewUrl ?? null,
    layersJson: t.layersJson, brandCompatible: t.brandCompatible, creditsRequired: t.creditsRequired,
    supportedExports: t.supportedExports, tags: t.tags, difficulty: t.difficulty,
    style: t.style ?? null, isPremium: t.isPremium, isFeatured: t.isFeatured, source: "config" as const,
  }));

  // Admin/DB templates (best-effort — table may be empty).
  let db: typeof config = [];
  const { data } = await supabase
    .from("design_templates")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (data) {
    db = data.map((t) => ({
      id: t.id, name: t.name, category: t.category, group: t.style ?? "", format: t.format,
      width: t.width, height: t.height, previewUrl: t.preview_url ?? null,
      layersJson: t.layers_json ?? [], brandCompatible: t.brand_compatible, creditsRequired: t.credits_required,
      supportedExports: t.supported_exports ?? ["png", "jpg"], tags: t.tags ?? [], difficulty: t.difficulty,
      style: t.style ?? null, isPremium: t.is_premium, isFeatured: t.is_featured, source: "config" as const,
    }));
  }

  let all = [...db, ...config];
  if (category) all = all.filter((t) => t.category === category);
  if (format) all = all.filter((t) => t.format === format);
  if (style) all = all.filter((t) => t.style === style);

  if (!Array.isArray(all)) return apiError("Failed to load templates", 500);
  return NextResponse.json({ templates: all });
}
