import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance } from "@/lib/credits";
import { buildOffers, type SiteScan } from "@/lib/seo-audit/site";

/**
 * GET /api/seo-audit/offers?id=<auditId>
 * The itemised "fix it for me" list for one audit: what each fix is, its price in credits, and whether it can be
 * done on the user's own site (a connected WordPress site) or comes as ready-to-paste text. Also what the user has
 * already paid for in this audit, and their credit balance. Owner only.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const { data: audit } = await supabase.from("seo_audits").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: rep } = await supabase.from("seo_audit_reports").select("report_json").eq("audit_id", id).maybeSingle();
  const site = (rep?.report_json as { site?: SiteScan } | null)?.site;
  if (!site) return NextResponse.json({ offers: [], fixes: {}, balance: await getCreditBalance(), needsFullAudit: true });

  // Is this website one the user has connected? Then pages can be created on it as drafts.
  const { data: wps } = await supabase.from("wordpress_sites").select("id, site_name, site_url");
  const wp = (wps ?? []).find((w) => { try { return new URL(w.site_url as string).hostname.toLowerCase().replace(/^www\./, "") === site.host; } catch { return false; } });

  const { data: fixRows } = await supabase.from("seo_audit_fixes").select("offer_id, status, result, error, credits").eq("audit_id", id);
  const fixes: Record<string, { status: string; result: unknown; error: string | null; credits: number }> = {};
  for (const f of fixRows ?? []) fixes[f.offer_id as string] = { status: f.status as string, result: f.result, error: (f.error as string | null) ?? null, credits: f.credits as number };

  return NextResponse.json({
    offers: buildOffers(site, !!wp), fixes, balance: await getCreditBalance(),
    wordpress: wp ? { name: wp.site_name } : null, host: site.host, origin: site.origin,
  });
}
