import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { screenSite } from "@/lib/seo/policy-server";
import { POLICY_MESSAGE } from "@/lib/seo/policy";
import { buildOffers, type SiteScan } from "@/lib/seo-audit/site";
import { runOffer } from "@/lib/seo-audit/fixes";
import { cleanFacts, countFacts } from "@/lib/seo-audit/facts";

/**
 * POST /api/seo-audit/rewrite { auditId, offerId }
 * Rewrites a page the user ALREADY paid for, now using the business details they saved afterwards, so it stops
 * carrying [Fill in] markers. Free, and once per page: it replaces the text they were given. Only for pages that
 * came back as ready-to-paste text (a page already created as a draft on their site is never duplicated).
 */
export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const rl = await limitRequestAsync(request, "seo-audit-rewrite", 6, 60_000);
  if (!rl.ok) return apiError("Please wait a moment.", 429);

  const body = await readJsonBody<{ auditId?: string; offerId?: string }>(request);
  if (!body || typeof body.auditId !== "string" || typeof body.offerId !== "string") return apiError("Missing details.", 400);

  const { data: audit } = await supabase.from("seo_audits").select("id").eq("id", body.auditId).eq("user_id", user.id).maybeSingle();
  if (!audit) return apiError("Not found.", 404);
  const { data: rep } = await supabase.from("seo_audit_reports").select("report_json").eq("audit_id", body.auditId).maybeSingle();
  const site = (rep?.report_json as { site?: SiteScan } | null)?.site;
  if (!site) return apiError("Run a Full Audit first.", 400);
  const policy = await screenSite(site.origin);
  if (policy.blocked) return apiError(POLICY_MESSAGE, 403);

  const admin = createAdminClient();
  const { data: row } = await admin.from("seo_audit_fixes").select("status, result").eq("audit_id", body.auditId).eq("offer_id", body.offerId).maybeSingle();
  const prior = row?.result as { kind?: string; rewritten?: boolean } | null;
  if (!row || row.status !== "done" || prior?.kind !== "paste") return apiError("Only a finished ready-to-paste page can be rewritten.", 400);
  if (prior.rewritten) return apiError("This page was already rewritten once with your details.", 400);

  const offer = buildOffers(site, false).find((o) => o.id === body.offerId);
  if (!offer || offer.fix !== "create_page") return apiError("Only written pages can be rewritten.", 400);

  const { data: factsRow } = await supabase.from("seo_business_facts").select("facts").eq("user_id", user.id).eq("host", site.host).maybeSingle();
  const facts = cleanFacts(factsRow?.facts);
  if (countFacts(facts) === 0) return apiError("Save your business details first, then rewrite.", 400);

  try {
    // wp: null so the rewrite never creates a second draft on their site.
    const result = await runOffer(offer, { site, wp: null, facts });
    const stored = { ...result, rewritten: true };
    await admin.from("seo_audit_fixes").update({ result: stored }).eq("audit_id", body.auditId).eq("offer_id", body.offerId);
    return NextResponse.json({ result: stored });
  } catch (e) {
    return apiError(e instanceof Error ? e.message.slice(0, 200) : "The rewrite could not be completed.", 500);
  }
}
