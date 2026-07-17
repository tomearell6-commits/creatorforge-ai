/**
 * Admin moderation for user-published websites.
 *
 * GET  /api/admin/build-sites?status=  — every user's published sites.
 * POST /api/admin/build-sites          — { siteId, action: "takedown", reason }
 *                                        or { siteId, action: "restore" }
 *
 * We host user-generated websites, so we need a real takedown path: a takedown
 * DELETES the hosted files (the live URL stops serving immediately) and records
 * who/why on the row. Restore only clears the flag — the owner must republish,
 * because the files are genuinely gone.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { readJsonBody, apiError } from "@/lib/api/respond";
import { removeDomain } from "@/lib/build/vercel-domains";

export const dynamic = "force-dynamic";

const BUCKET = "media";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = gate.admin;

  const status = new URL(request.url).searchParams.get("status");
  let q = admin
    .from("build_sites")
    .select("id, user_id, project_id, slug, title, template, status, live_url, page_count, bytes, removed_reason, removed_at, published_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return apiError(error.message, 400);
  return NextResponse.json({ sites: data ?? [] });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = gate.admin;

  const body = await readJsonBody<{ siteId?: string; action?: string; reason?: string }>(request);
  if (!body?.siteId) return apiError("siteId is required", 400);

  const { data: site } = await admin.from("build_sites").select("*").eq("id", body.siteId).maybeSingle();
  if (!site) return apiError("Site not found", 404);

  if (body.action === "restore") {
    const { data, error } = await admin
      .from("build_sites")
      .update({ status: "unpublished", removed_reason: null, removed_at: null, updated_at: new Date().toISOString() })
      .eq("id", site.id).select("*").single();
    if (error) return apiError(error.message, 400);
    return NextResponse.json({ site: data, note: "Flag cleared. The owner must republish — the files were deleted." });
  }

  if (body.action !== "takedown") return apiError("Unsupported action", 400);
  const reason = body.reason?.trim();
  if (!reason) return apiError("A takedown reason is required — it's recorded on the site.", 400);

  // Actually remove the hosted files, not just flip a flag.
  if (site.storage_path) {
    const { data: listed } = await admin.storage.from(BUCKET).list(site.storage_path);
    const paths = (listed ?? []).map((f) => `${site.storage_path}/${f.name}`);
    if (paths.length) await admin.storage.from(BUCKET).remove(paths);
  }
  // Detach any custom domain too — a removed site must not keep a domain
  // pointed at our project.
  if (site.custom_domain) await removeDomain(site.custom_domain);

  const { data, error } = await admin
    .from("build_sites")
    .update({
      status: "removed",
      live_url: null,
      custom_domain: null,
      domain_status: "none",
      domain_verified_at: null,
      removed_reason: reason.slice(0, 300),
      removed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", site.id).select("*").single();
  if (error) return apiError(error.message, 400);

  return NextResponse.json({ site: data });
}
