import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { decryptSecret } from "@/lib/security/secrets";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { screenSite } from "@/lib/seo/policy-server";
import { POLICY_MESSAGE } from "@/lib/seo/policy";
import { buildOffers, type SiteScan } from "@/lib/seo-audit/site";
import { runOffer, type FixContext, type FixResult } from "@/lib/seo-audit/fixes";

/**
 * POST /api/seo-audit/fix { auditId, offerIds: string[] }
 * Does the fixes the user chose, one by one, and takes the credits for each ONLY after it succeeded.
 * Prices are recomputed here from the stored audit, never taken from the browser. A fix already done in this
 * audit is returned again without a second charge. On a connected WordPress site pages are created as DRAFTS.
 */
export const maxDuration = 300;

type Outcome = { offerId: string; status: "done" | "failed" | "skipped"; credits: number; result?: FixResult; error?: string; alreadyDone?: boolean };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const rl = await limitRequestAsync(request, "seo-audit-fix-run", 8, 60_000);
  if (!rl.ok) return apiError("Please wait a moment before the next fix.", 429);

  const body = await readJsonBody<{ auditId?: string; offerIds?: string[] }>(request);
  if (!body || typeof body.auditId !== "string" || !Array.isArray(body.offerIds) || body.offerIds.length === 0) return apiError("Choose at least one fix.", 400);

  const { data: audit } = await supabase.from("seo_audits").select("id").eq("id", body.auditId).eq("user_id", user.id).maybeSingle();
  if (!audit) return apiError("Not found.", 404);
  const { data: rep } = await supabase.from("seo_audit_reports").select("report_json").eq("audit_id", body.auditId).maybeSingle();
  const site = (rep?.report_json as { site?: SiteScan } | null)?.site;
  if (!site) return apiError("Run a Full Audit first: fixes are priced from the whole-site check.", 400);

  const policy = await screenSite(site.origin);
  if (policy.blocked) return apiError(POLICY_MESSAGE, 403);

  // The user's connected WordPress site for this host, if any.
  const { data: wps } = await supabase.from("wordpress_sites").select("*");
  const wpRow = (wps ?? []).find((w) => { try { return new URL(w.site_url as string).hostname.toLowerCase().replace(/^www\./, "") === site.host; } catch { return false; } });
  const password = wpRow ? decryptSecret(wpRow.encrypted_application_password as string) : null;
  const ctx: FixContext = { site, wp: wpRow && password ? { siteUrl: wpRow.site_url as string, username: wpRow.username as string, appPassword: password } : null };

  const offers = new Map(buildOffers(site, !!ctx.wp).map((o) => [o.id, o]));
  const chosen = [...new Set(body.offerIds)].map((id) => offers.get(id));
  if (chosen.some((o) => !o)) return apiError("One of those fixes is not available for this audit.", 400);

  const admin = createAdminClient();
  const { data: existing } = await admin.from("seo_audit_fixes").select("offer_id, status, result, credits").eq("audit_id", body.auditId);
  const done = new Map((existing ?? []).filter((r) => r.status === "done").map((r) => [r.offer_id as string, r]));

  // Everything not already paid for must be affordable before we start.
  const todo = chosen.filter((o) => o && !done.has(o.id));
  const total = todo.reduce((n, o) => n + (o?.credits ?? 0), 0);
  const balance = await getCreditBalance();
  if (balance < total) return NextResponse.json({ error: `Not enough credits: these fixes cost ${total} and you have ${balance}.`, code: "insufficient_credits", needed: total, balance }, { status: 402 });

  const results: Outcome[] = [];
  for (const offer of chosen) {
    if (!offer) continue;
    const prior = done.get(offer.id);
    if (prior) { results.push({ offerId: offer.id, status: "done", credits: 0, result: prior.result as FixResult, alreadyDone: true }); continue; }

    try {
      if ((await getCreditBalance()) < offer.credits) { results.push({ offerId: offer.id, status: "skipped", credits: 0, error: "Not enough credits left for this one." }); continue; }
      const result = await runOffer(offer, ctx);
      // Credits are taken only now that the fix exists.
      const left = await deductCredits(offer.credits, `seo_audit_fix:${offer.id}`);
      if (left === null) { results.push({ offerId: offer.id, status: "skipped", credits: 0, error: "Not enough credits left for this one." }); continue; }
      await admin.from("seo_audit_fixes").upsert({ audit_id: body.auditId, user_id: user.id, offer_id: offer.id, status: "done", credits: offer.credits, result, error: null }, { onConflict: "audit_id,offer_id" });
      results.push({ offerId: offer.id, status: "done", credits: offer.credits, result });
    } catch (e) {
      const message = e instanceof Error ? e.message.slice(0, 200) : "The fix could not be completed.";
      const diag = (e as { diag?: unknown } | null)?.diag;
      await admin.from("seo_audit_fixes").upsert({ audit_id: body.auditId, user_id: user.id, offer_id: offer.id, status: "failed", credits: 0, result: Array.isArray(diag) ? { diag: diag.slice(0, 6).map((x) => String(x).slice(0, 600)) } : {}, error: message }, { onConflict: "audit_id,offer_id" });
      results.push({ offerId: offer.id, status: "failed", credits: 0, error: /no credits were charged/i.test(message) ? message : `${message} No credits were charged for this one.` });
    }
  }
  return NextResponse.json({ results, charged: results.reduce((n, r) => n + r.credits, 0), balance: await getCreditBalance() });
}
