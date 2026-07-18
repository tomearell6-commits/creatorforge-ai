/**
 * GET  /api/build/sites?projectId=  — the user's published sites.
 * POST /api/build/sites             — { siteId, action: "unpublish" } takes a
 *                                     site offline and REMOVES the hosted files
 *                                     (not just a status flag).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getUserPlan } from "@/lib/plan";
import { planAllowsCustomDomain, customDomainLimit } from "@/config/buildStudio";

export const dynamic = "force-dynamic";

const BUCKET = "media";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const projectId = new URL(request.url).searchParams.get("projectId");
  let q = supabase.from("build_sites").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);

  const { data, error } = await q;
  if (error) return apiError(error.message, 400);

  // Drives the custom-domain panel: entitlement + remaining slots (the domain
  // route enforces the same checks server-side). The cap is per-USER across ALL
  // projects, so count separately — `data` may be filtered to one project.
  const plan = await getUserPlan(supabase);
  const limit = customDomainLimit(plan);
  const { count: used } = await supabase
    .from("build_sites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("custom_domain", "is", null);
  return NextResponse.json({
    sites: data ?? [],
    customDomainAllowed: planAllowsCustomDomain(plan),
    customDomainLimit: Number.isFinite(limit) ? limit : null, // null = unlimited
    customDomainUsed: used ?? 0,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ siteId?: string; action?: string }>(request);
  if (!body?.siteId) return apiError("siteId is required", 400);
  if (body.action !== "unpublish") return apiError("Unsupported action", 400);

  const { data: site } = await supabase
    .from("build_sites").select("*").eq("id", body.siteId).eq("user_id", user.id).maybeSingle();
  if (!site) return apiError("Site not found", 404);

  // Actually remove the hosted files so the live URL stops serving.
  if (site.storage_path) {
    const { data: listed } = await supabase.storage.from(BUCKET).list(site.storage_path);
    const paths = (listed ?? []).map((f) => `${site.storage_path}/${f.name}`);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  }

  const { data: updated, error } = await supabase
    .from("build_sites")
    .update({ status: "unpublished", live_url: null, updated_at: new Date().toISOString() })
    .eq("id", site.id).eq("user_id", user.id).select("*").single();
  if (error) return apiError(error.message, 400);

  return NextResponse.json({ site: updated });
}
