/**
 * POST /api/build/sites/publish { projectId, template? }
 *
 * Renders a generated blueprint into a REAL multi-page static website and
 * publishes it. Files are uploaded to Supabase Storage under the user's own
 * folder (satisfies the media-bucket RLS) and the live URL is the STORAGE
 * public URL.
 *
 * SECURITY: the site is intentionally served from the storage origin, NOT from
 * creatorsforge.io. User-generated HTML must never be same-origin with the app,
 * or a published site could read app cookies / hijack sessions.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { renderSite, slugify, type SiteTemplateId } from "@/lib/build/site";
import { BUILD_CREDIT_COSTS, BUILD_CREDIT_REASONS } from "@/config/buildStudio";
import type { BuildPackage } from "@/lib/build/package";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "media";
const MAX_SITE_BYTES = 5_000_000; // generated HTML is tiny; this is an abuse guard

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ projectId?: string; template?: SiteTemplateId }>(request);
  if (!body?.projectId) return apiError("projectId is required", 400);

  const { data: project } = await supabase
    .from("build_projects").select("*").eq("id", body.projectId).eq("user_id", user.id).maybeSingle();
  if (!project) return apiError("Project not found", 404);

  const pkg = project.package_json as BuildPackage | null;
  if (!pkg || !Array.isArray(pkg.pages)) {
    return apiError("Generate the blueprint first — there's nothing to publish yet.", 400);
  }

  // Render deterministically (all content escaped inside renderSite).
  const title = String(project.title || pkg.projectNameIdeas?.[0] || "My site").slice(0, 80);
  const template = (body.template ?? "modern") as SiteTemplateId;
  const files = renderSite(pkg, { title, template });
  const bytes = files.reduce((n, f) => n + Buffer.byteLength(f.html, "utf8"), 0);
  if (bytes > MAX_SITE_BYTES) return apiError("This site is too large to publish.", 400);

  // Reuse the project's existing site row so republishing keeps the same URL.
  const { data: existing } = await supabase
    .from("build_sites").select("*").eq("project_id", project.id).eq("user_id", user.id).maybeSingle();

  const cost = BUILD_CREDIT_COSTS.publishSite;
  if (cost > 0) {
    const balance = await getCreditBalance();
    if (balance < cost) {
      return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost, balance } });
    }
  }

  const siteId = existing?.id ?? crypto.randomUUID();
  const slug = existing?.slug ?? `${slugify(title)}-${siteId.slice(0, 6)}`;
  // User's own folder => passes the media bucket's owner RLS policy.
  const basePath = `${user.id}/sites/${siteId}`;

  for (const f of files) {
    const { error } = await supabase.storage.from(BUCKET).upload(`${basePath}/${f.path}`, Buffer.from(f.html, "utf8"), {
      contentType: "text/html; charset=utf-8",
      upsert: true,
    });
    if (error) return apiError(`Publishing failed: ${error.message}`, 502);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(`${basePath}/index.html`);
  const liveUrl = pub.publicUrl;
  const now = new Date().toISOString();

  const row = {
    id: siteId,
    user_id: user.id,
    project_id: project.id,
    slug,
    title,
    template,
    status: "published",
    live_url: liveUrl,
    storage_path: basePath,
    page_count: files.length,
    bytes,
    published_at: now,
    updated_at: now,
  };

  const { data: site, error: dbErr } = await supabase
    .from("build_sites").upsert(row, { onConflict: "id" }).select("*").single();
  if (dbErr) return apiError(dbErr.message, 400);

  if (cost > 0) await deductCredits(cost, BUILD_CREDIT_REASONS.publishSite);

  return NextResponse.json({ site, liveUrl, pages: files.length, charged: cost });
}
