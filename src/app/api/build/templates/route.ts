import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BUILD_TEMPLATES } from "@/config/buildTemplates";

export const dynamic = "force-dynamic";

/** GET /api/build/templates — built-in catalogue merged with admin DB rows. */
export async function GET() {
  const supabase = await createClient();

  const config = BUILD_TEMPLATES.map((t) => ({ ...t, source: "config" as const }));
  const { data } = await supabase
    .from("build_templates").select("*").eq("is_active", true).order("sort_order");
  const db = (data ?? []).map((t) => ({
    id: t.id, name: t.name, category: t.category ?? "website", projectType: t.project_type ?? "business-website",
    description: t.description ?? "", defaultIdea: t.default_idea ?? "", estimatedCredits: t.estimated_credits ?? 20,
    tags: t.tags ?? [], isFeatured: t.is_featured, isPremium: t.is_premium, source: "config" as const,
  }));
  return NextResponse.json({ templates: [...db, ...config] });
}
