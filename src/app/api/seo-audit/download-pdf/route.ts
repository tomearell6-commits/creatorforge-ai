import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { SEO_AUDIT_PDF_CREDITS } from "@/lib/constants";

/**
 * POST /api/seo-audit/download-pdf { auditId } — charge for a PDF export (5 credits).
 * The client then renders a print-friendly report and uses the browser's
 * "Save as PDF". Returns 402 if the user can't afford it.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { auditId } = (await request.json().catch(() => ({}))) as { auditId?: string };
  if (!auditId) return NextResponse.json({ error: "Missing auditId." }, { status: 400 });

  const { data: audit } = await supabase.from("seo_audits").select("id").eq("id", auditId).eq("user_id", user.id).maybeSingle();
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cost = SEO_AUDIT_PDF_CREDITS;
  if ((await getCreditBalance()) < cost) return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits", needed: cost }, { status: 402 });

  await deductCredits(cost, "seo_audit_pdf");
  return NextResponse.json({ ok: true, creditsUsed: cost });
}
