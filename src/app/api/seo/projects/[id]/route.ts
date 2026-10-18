import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/respond";

/** One website's full analysis (brand, competitors, keywords, gaps, 30-day plan). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  // Owner-only via RLS.
  const { data, error } = await supabase.from("seo_projects")
    .select("id, website_url, name, status, progress, error, brand, competitors, keywords, gaps, plan, language, analyzed_at, updated_at")
    .eq("id", id).maybeSingle();
  if (error) return apiError(error.message, 500);
  if (!data) return apiError("Not found.", 404);
  return NextResponse.json({ project: data });
}

/** Remove a website's analysis. Any auto-poster started from it keeps running (it only loses the link). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const { error } = await supabase.from("seo_projects").delete().eq("id", id);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ ok: true });
}
