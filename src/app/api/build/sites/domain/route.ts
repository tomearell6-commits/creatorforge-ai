/**
 * POST /api/build/sites/domain — connect a customer's own domain to a published
 * site. Professional plan and up.
 *
 *   { siteId, action: "attach", domain }  -> validate + add to Vercel, mark pending
 *   { siteId, action: "verify" }          -> ask Vercel if DNS is right yet
 *   { siteId, action: "remove" }          -> detach from Vercel + clear
 *
 * Vercel provisions and renews the SSL certificate once DNS resolves. We never
 * claim a domain is live until Vercel confirms it.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { getUserPlan } from "@/lib/plan";
import { planAllowsCustomDomain, customDomainLimit } from "@/config/buildStudio";
import { addDomain, getDomainConfig, removeDomain, normalizeDomain, vercelDomainsConfigured } from "@/lib/build/vercel-domains";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await readJsonBody<{ siteId?: string; action?: string; domain?: string }>(request);
  if (!body?.siteId) return apiError("siteId is required", 400);

  const plan = await getUserPlan(supabase);
  if (!planAllowsCustomDomain(plan)) {
    return apiError("Custom domains are available on the Professional plan and up.", 403, { code: "upgrade_required" });
  }
  if (!vercelDomainsConfigured()) {
    return apiError("Custom domains aren't enabled on the server yet.", 503, { code: "not_configured" });
  }

  const { data: site } = await supabase
    .from("build_sites").select("*").eq("id", body.siteId).eq("user_id", user.id).maybeSingle();
  if (!site) return apiError("Site not found", 404);

  const touch = { updated_at: new Date().toISOString() };

  // ---- attach -------------------------------------------------------------
  if (body.action === "attach") {
    const { host, error } = normalizeDomain(body.domain ?? "");
    if (!host) return apiError(error ?? "Enter a domain.", 400);

    // Globally unique: someone else may already have claimed it here.
    const { data: taken } = await supabase
      .from("build_sites").select("id").eq("custom_domain", host).neq("id", site.id).maybeSingle();
    if (taken) return apiError("That domain is already connected to another site.", 409);

    // Plan cap: only count sites OTHER than this one (re-pointing this site's
    // domain shouldn't consume a second slot). At the limit → upgrade.
    const limit = customDomainLimit(plan);
    if (Number.isFinite(limit)) {
      const { count } = await supabase
        .from("build_sites")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("custom_domain", "is", null)
        .neq("id", site.id);
      if ((count ?? 0) >= limit) {
        return apiError(
          `Your plan includes ${limit} custom domain${limit === 1 ? "" : "s"}, and you've used ${count}. Remove one or upgrade for more.`,
          403,
          { code: "domain_limit" },
        );
      }
    }

    // Swap: detach whatever this site had before.
    if (site.custom_domain && site.custom_domain !== host) await removeDomain(site.custom_domain);

    const added = await addDomain(host);
    if (!added.ok) return apiError(added.error ?? "Couldn't add that domain.", 502);

    const cfg = await getDomainConfig(host);
    const { data, error: dbErr } = await supabase.from("build_sites").update({
      custom_domain: host,
      domain_status: cfg.verified ? "verified" : "pending",
      domain_verified_at: cfg.verified ? new Date().toISOString() : null,
      domain_error: null,
      ...touch,
    }).eq("id", site.id).select("*").single();
    if (dbErr) return apiError(dbErr.message, 400);

    return NextResponse.json({ site: data, config: cfg });
  }

  // ---- verify -------------------------------------------------------------
  if (body.action === "verify") {
    if (!site.custom_domain) return apiError("No domain is connected to this site.", 400);
    const cfg = await getDomainConfig(site.custom_domain);

    const { data, error: dbErr } = await supabase.from("build_sites").update({
      domain_status: cfg.verified ? "verified" : cfg.error ? "error" : "pending",
      domain_verified_at: cfg.verified ? new Date().toISOString() : null,
      domain_error: cfg.error ?? null,
      ...touch,
    }).eq("id", site.id).select("*").single();
    if (dbErr) return apiError(dbErr.message, 400);

    return NextResponse.json({ site: data, config: cfg });
  }

  // ---- remove -------------------------------------------------------------
  if (body.action === "remove") {
    if (site.custom_domain) await removeDomain(site.custom_domain);
    const { data, error: dbErr } = await supabase.from("build_sites").update({
      custom_domain: null, domain_status: "none", domain_verified_at: null, domain_error: null, ...touch,
    }).eq("id", site.id).select("*").single();
    if (dbErr) return apiError(dbErr.message, 400);
    return NextResponse.json({ site: data });
  }

  return apiError("Unsupported action", 400);
}
