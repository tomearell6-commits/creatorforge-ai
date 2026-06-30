import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AD_TEMPLATES } from "@/lib/ads/templates";

/** GET — industry starter templates (DB authoritative, constant fallback). */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("campaign_templates").select("slug, name, objective, suggested_copy, creative_ideas, recommended_formats, suggested_cta").order("sort_order");
    if (data && data.length > 0) return NextResponse.json({ templates: data });
  } catch { /* table not migrated yet → fallback */ }
  return NextResponse.json({ templates: AD_TEMPLATES });
}
