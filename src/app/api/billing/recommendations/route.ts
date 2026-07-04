import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWalletSummary } from "@/lib/credits/wallet";
import { buildUsageReport } from "@/lib/billing/usage";
import { computeRecommendations, syncRecommendations } from "@/lib/billing/recommendations";

/**
 * GET  /api/billing/recommendations — recompute from live usage, persist, and
 * return the non-dismissed set.
 * POST { recKey } — dismiss one.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wallet = await getWalletSummary();
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const usage = await buildUsageReport(user.id);
  const recs = computeRecommendations(wallet, usage);
  await syncRecommendations(user.id, recs);

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("upgrade_recommendations")
    .select("rec_key, title, body, cta_label, cta_href, severity")
    .eq("user_id", user.id)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  // Only surface recommendations that are still CURRENT (rule fired this pass).
  const currentKeys = new Set(recs.map((r) => r.recKey));
  return NextResponse.json({
    recommendations: (rows ?? []).filter((r) => currentKeys.has(r.rec_key)),
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recKey } = await req.json().catch(() => ({}));
  if (typeof recKey !== "string") return NextResponse.json({ error: "recKey required" }, { status: 400 });

  const admin = createAdminClient();
  await admin
    .from("upgrade_recommendations")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("rec_key", recKey);
  return NextResponse.json({ ok: true });
}
