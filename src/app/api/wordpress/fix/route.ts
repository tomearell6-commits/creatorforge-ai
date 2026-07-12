import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/security/secrets";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { basicAuth, applyMetaFix } from "@/lib/seo/wpfix";
import { apiError } from "@/lib/api/respond";

export const maxDuration = 60;

const COST_PER_FIX = 3;

type IncomingFix = {
  postId: number; postType: "post" | "page"; url?: string; title?: string;
  metaTitle?: string | null; metaDescription?: string | null;
};

/**
 * POST { siteId, fixes: [...] } — apply the user-approved meta fixes to the
 * connected WordPress site. Charges COST_PER_FIX per SUCCESSFUL fix and logs
 * every change (before values captured client-side) to wordpress_seo_fixes.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "wp-fix", 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const b = (await request.json().catch(() => ({}))) as { siteId?: string; fixes?: IncomingFix[] };
  if (!b.siteId || !Array.isArray(b.fixes) || b.fixes.length === 0) return apiError("siteId and fixes are required.", 400);
  const fixes = b.fixes.slice(0, 20);

  const { data: site } = await supabase.from("wordpress_sites").select("*").eq("id", b.siteId).single();
  if (!site) return apiError("WordPress site not found.", 404);
  const appPassword = decryptSecret(site.encrypted_application_password);
  if (!appPassword) return apiError("Couldn't read the site credentials — reconnect the site.", 400);

  // Pre-check enough credits for the maximum (charged per successful fix below).
  if ((await getCreditBalance()) < COST_PER_FIX) {
    return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits" }, { status: 402 });
  }

  const auth = basicAuth(site.username, appPassword);
  const results: { postId: number; ok: boolean; error?: string }[] = [];
  let applied = 0, charged = 0;

  for (const f of fixes) {
    if (charged > 0 && (await getCreditBalance()) < COST_PER_FIX) { results.push({ postId: f.postId, ok: false, error: "Out of credits" }); continue; }
    const res = await applyMetaFix(site.site_url, auth, { postId: f.postId, postType: f.postType, metaTitle: f.metaTitle, metaDescription: f.metaDescription });
    results.push({ postId: f.postId, ok: res.ok, error: res.error });

    // Log each attempted fix type (transparency + reversibility).
    const rows: Record<string, unknown>[] = [];
    if (f.metaTitle) rows.push({ user_id: user.id, site_id: b.siteId, post_id: String(f.postId), post_type: f.postType, post_url: f.url ?? null, fix_type: "meta_title", after_value: f.metaTitle, status: res.ok ? "applied" : "failed", credits_charged: res.ok ? COST_PER_FIX : 0 });
    if (f.metaDescription) rows.push({ user_id: user.id, site_id: b.siteId, post_id: String(f.postId), post_type: f.postType, post_url: f.url ?? null, fix_type: "meta_description", after_value: f.metaDescription, status: res.ok ? "applied" : "failed", credits_charged: 0 });
    if (rows.length) await supabase.from("wordpress_seo_fixes").insert(rows);

    if (res.ok) { applied += 1; await deductCredits(COST_PER_FIX, "wordpress_seo_fix"); charged += COST_PER_FIX; }
  }

  return NextResponse.json({ ok: true, applied, charged, results });
}
