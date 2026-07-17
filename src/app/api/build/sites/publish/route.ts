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
import { renderSite, slugify, brandName, heroImagePrompt, type SiteTemplateId } from "@/lib/build/site";
import { BUILD_CREDIT_COSTS, BUILD_CREDIT_REASONS } from "@/config/buildStudio";
import { generateDesignImage } from "@/lib/design/image";
import { fetchWithTimeout } from "@/lib/http";
import type { BuildPackage } from "@/lib/build/package";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "media";
const MAX_SITE_BYTES = 5_000_000; // generated HTML is tiny; this is an abuse guard

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{
    projectId?: string; template?: SiteTemplateId; contactEmail?: string;
    heroImage?: boolean; regenerateHero?: boolean;
  }>(request);
  if (!body?.projectId) return apiError("projectId is required", 400);
  const contactEmail = body.contactEmail?.trim() || null;
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactEmail)) {
    return apiError("That contact email doesn't look valid.", 400);
  }

  const { data: project } = await supabase
    .from("build_projects").select("*").eq("id", body.projectId).eq("user_id", user.id).maybeSingle();
  if (!project) return apiError("Project not found", 404);

  const pkg = project.package_json as BuildPackage | null;
  if (!pkg || !Array.isArray(pkg.pages)) {
    return apiError("Generate the blueprint first — there's nothing to publish yet.", 400);
  }

  const title = String(project.title || pkg.projectNameIdeas?.[0] || "My site").slice(0, 80);
  const template = (body.template ?? "modern") as SiteTemplateId;

  // Reuse the project's existing site row so republishing keeps the same URL.
  const { data: existing } = await supabase
    .from("build_sites").select("*").eq("project_id", project.id).eq("user_id", user.id).maybeSingle();

  const cost = BUILD_CREDIT_COSTS.publishSite;
  const heroCost = body.heroImage ? BUILD_CREDIT_COSTS.heroImage : 0;
  const balance = await getCreditBalance();
  if (cost + heroCost > 0 && balance < cost + heroCost) {
    return apiError("Insufficient credits", 402, { code: "insufficient_credits", details: { required: cost + heroCost, balance } });
  }

  const siteId = existing?.id ?? crypto.randomUUID();
  const slug = existing?.slug ?? `${slugify(title)}-${siteId.slice(0, 6)}`;
  // User's own folder => passes the media bucket's owner RLS policy.
  const basePath = `${user.id}/sites/${siteId}`;
  const heroPath = `${basePath}/hero.jpg`;

  // Hero image (opt-in). Reuse the stored one on republish so nobody pays twice
  // for the same picture — regenerate only when explicitly asked.
  let heroImageUrl: string | null = null;
  let heroCharged = 0;
  if (body.heroImage) {
    const { data: pubHero } = supabase.storage.from(BUCKET).getPublicUrl(heroPath);
    const { data: listed } = await supabase.storage.from(BUCKET).list(basePath, { search: "hero.jpg" });
    const heroExists = (listed ?? []).some((f) => f.name === "hero.jpg");

    if (heroExists && !body.regenerateHero) {
      heroImageUrl = pubHero.publicUrl;
    } else {
      try {
        const brand = brandName(pkg, title);
        const img = await generateDesignImage(heroImagePrompt(pkg, { brand, style: project.style }), { width: 1024, height: 768 });
        const res = await fetchWithTimeout(img.url, {}, 30_000);
        if (res.ok) {
          const imgBytes = Buffer.from(await res.arrayBuffer());
          if (imgBytes.byteLength > 0) {
            const { error: upErr } = await supabase.storage.from(BUCKET)
              .upload(heroPath, imgBytes, { contentType: "image/jpeg", upsert: true });
            if (!upErr) {
              heroImageUrl = `${pubHero.publicUrl}?v=${Date.now()}`;
              // Only charge when a REAL AI image was produced and stored.
              if (img.usedAI) heroCharged = BUILD_CREDIT_COSTS.heroImage;
            }
          }
        }
      } catch {
        // The hero is a nice-to-have — never fail a publish over it.
        heroImageUrl = null;
      }
    }
  }

  // Render deterministically (all content escaped inside renderSite).
  const files = renderSite(pkg, { title, template, contactEmail, heroImageUrl });
  const bytes = files.reduce((n, f) => n + Buffer.byteLength(f.html, "utf8"), 0);
  if (bytes > MAX_SITE_BYTES) return apiError("This site is too large to publish.", 400);

  for (const f of files) {
    const { error } = await supabase.storage.from(BUCKET).upload(`${basePath}/${f.path}`, Buffer.from(f.html, "utf8"), {
      contentType: "text/html; charset=utf-8",
      upsert: true,
    });
    if (error) return apiError(`Publishing failed: ${error.message}`, 502);
  }

  // Served by /s/[slug] — Supabase Storage force-serves HTML as text/plain, so
  // it can't host pages. SITES_BASE_URL lets us move sites to a dedicated
  // domain later without touching stored URLs.
  const siteHost = process.env.SITES_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.creatorsforge.io";
  const liveUrl = `${siteHost.replace(/\/$/, "")}/s/${slug}`;
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

  const charged = cost + heroCharged;
  if (charged > 0) await deductCredits(charged, BUILD_CREDIT_REASONS.publishSite);

  return NextResponse.json({ site, liveUrl, pages: files.length, charged, heroImage: !!heroImageUrl });
}
