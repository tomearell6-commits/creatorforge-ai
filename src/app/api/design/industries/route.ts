import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INDUSTRY_SUITES } from "@/config/industrySuites";
import { getIndustryTemplatesForSuite, INDUSTRY_TEMPLATES } from "@/config/industryTemplates";

export const dynamic = "force-dynamic";

/**
 * GET /api/design/industries[?suite=slug] — Industry Suites catalogue.
 * Merges the built-in registry (config) with any admin-added rows in the
 * industry_suites / industry_templates tables. Viewing is free.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const suiteSlug = new URL(request.url).searchParams.get("suite");

  // Built-in registry.
  const suites = INDUSTRY_SUITES.map((s) => ({ ...s, templateCount: getIndustryTemplatesForSuite(s.id).length }));

  // DB overlay (best-effort — table may be empty or migration not yet run).
  const { data: dbSuites } = await supabase
    .from("industry_suites")
    .select("name, slug, description, icon, status, sort_order");
  const known = new Set(suites.map((s) => s.id));
  const extra = (dbSuites ?? [])
    .filter((s) => !known.has(s.slug))
    .map((s) => ({
      id: s.slug, name: s.name, icon: s.icon ?? "LayoutGrid", description: s.description ?? "",
      status: (s.status === "active" ? "active" : "coming_soon") as "active" | "coming_soon",
      order: 100 + (s.sort_order ?? 0), integrations: [], templateCount: 0,
    }));

  if (!suiteSlug) {
    return NextResponse.json({ suites: [...suites, ...extra].sort((a, b) => a.order - b.order) });
  }

  const suite = [...suites, ...extra].find((s) => s.id === suiteSlug);
  if (!suite) return NextResponse.json({ error: "Suite not found" }, { status: 404 });

  // Templates: built-in + admin-added DB templates for this suite.
  const configTemplates = INDUSTRY_TEMPLATES.filter((x) => x.industrySuite === suiteSlug);
  let dbTemplates: typeof configTemplates = [];
  const { data: suiteRow } = await supabase.from("industry_suites").select("id").eq("slug", suiteSlug).maybeSingle();
  if (suiteRow) {
    const { data } = await supabase
      .from("industry_templates")
      .select("*")
      .eq("industry_suite_id", suiteRow.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    dbTemplates = (data ?? []).map((x) => ({
      id: x.id, name: x.name, slug: x.slug, industrySuite: suiteSlug, category: "",
      outputType: x.output_type, description: x.description ?? "",
      requiredInputs: Array.isArray(x.required_inputs_json) ? x.required_inputs_json : [],
      defaultPrompt: x.default_prompt ?? "", previewIcon: "Building2",
      estimatedCredits: x.estimated_credits ?? 8,
      exportFormats: Array.isArray(x.export_formats_json) ? x.export_formats_json : ["png", "jpg", "pdf"],
      tags: Array.isArray(x.tags_json) ? x.tags_json : [],
      isFeatured: x.is_featured, isPremium: x.is_premium,
    }));
  }

  return NextResponse.json({ suite, templates: [...configTemplates, ...dbTemplates] });
}
