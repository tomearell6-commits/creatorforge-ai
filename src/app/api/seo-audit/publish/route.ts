import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/security/secrets";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { apiError, readJsonBody } from "@/lib/api/respond";
import { fetchWithTimeout } from "@/lib/http";
import { normalizeSite } from "@/lib/publishing/providers/wordpress";
import type { SiteScan } from "@/lib/seo-audit/site";

/**
 * POST /api/seo-audit/publish { auditId, offerId }
 * The owner's approval: publishes a page that Forge saved as a DRAFT on their connected WordPress site.
 * Free (the page was already paid for). Only pages Forge itself created in this audit can be published here.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const rl = await limitRequestAsync(request, "seo-audit-publish", 20, 60_000);
  if (!rl.ok) return apiError("Please wait a moment.", 429);

  const body = await readJsonBody<{ auditId?: string; offerId?: string }>(request);
  if (!body || typeof body.auditId !== "string" || typeof body.offerId !== "string") return apiError("Missing details.", 400);

  const { data: audit } = await supabase.from("seo_audits").select("id").eq("id", body.auditId).eq("user_id", user.id).maybeSingle();
  if (!audit) return apiError("Not found.", 404);
  const { data: rep } = await supabase.from("seo_audit_reports").select("report_json").eq("audit_id", body.auditId).maybeSingle();
  const site = (rep?.report_json as { site?: SiteScan } | null)?.site;
  if (!site) return apiError("Run a Full Audit first.", 400);

  const admin = createAdminClient();
  const { data: row } = await admin.from("seo_audit_fixes").select("status, result").eq("audit_id", body.auditId).eq("offer_id", body.offerId).maybeSingle();
  const prior = row?.result as { kind?: string; state?: string; pageId?: number } | null;
  if (!row || row.status !== "done" || prior?.kind !== "draft_created" || typeof prior.pageId !== "number") return apiError("That page was not saved as a draft by Forge.", 400);
  if (prior.state === "published") return apiError("This page is already published.", 400);

  const { data: wps } = await supabase.from("wordpress_sites").select("*");
  const wpRow = (wps ?? []).find((w) => { try { return new URL(w.site_url as string).hostname.toLowerCase().replace(/^www\./, "") === site.host; } catch { return false; } });
  const password = wpRow ? decryptSecret(wpRow.encrypted_application_password as string) : null;
  if (!wpRow || !password) return apiError("Connect your WordPress site first.", 400);

  const base = normalizeSite(wpRow.site_url as string);
  const auth = `Basic ${Buffer.from(`${wpRow.username as string}:${password.replace(/\s+/g, "")}`).toString("base64")}`;
  try {
    const res = await fetchWithTimeout(`${base}/wp-json/wp/v2/pages/${prior.pageId}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (compatible; CreatorsForgeSEOFixer/1.0)" },
      body: JSON.stringify({ status: "publish" }),
    }, 30_000);
    if (!res.ok) return apiError(`WordPress did not publish the page (HTTP ${res.status}). Open it in WordPress and publish it there.`, 502);
    const j = (await res.json().catch(() => ({}))) as { link?: string };
    const result = { ...(row.result as object), state: "published", liveUrl: j.link };
    await admin.from("seo_audit_fixes").update({ result }).eq("audit_id", body.auditId).eq("offer_id", body.offerId);
    return NextResponse.json({ result });
  } catch {
    return apiError("Could not reach your WordPress site.", 502);
  }
}
