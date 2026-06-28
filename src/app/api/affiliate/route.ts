import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AFFILIATE_RATE } from "@/lib/constants";

/**
 * Affiliate Center (Phase 7 — Module 5).
 * GET  -> the user's affiliate account (if any) + commission/conversion reports.
 * POST { action: "register" | "payout", payoutMethod? }.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabase
    .from("affiliate_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) return NextResponse.json({ account: null });

  const { data: commissions } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .eq("affiliate_id", account.id)
    .order("created_at", { ascending: false });

  const rows = commissions ?? [];
  const earnings = rows.reduce((s, c) => s + Number(c.amount), 0);
  const paid = rows.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.creatorsforge.io";

  return NextResponse.json({
    account,
    link: `${base}/?aff=${account.code}`,
    report: {
      clicks: 0, // populated from affiliate_clicks by the tracker
      conversions: rows.length,
      totalEarnings: earnings,
      paid,
      balance: Number(account.balance),
    },
    commissions: rows,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, payoutMethod } = await request.json();

  if (action === "register") {
    const code = "aff" + user.id.replace(/-/g, "").slice(0, 8);
    const { data, error } = await supabase
      .from("affiliate_accounts")
      .upsert(
        { user_id: user.id, code, status: "active", commission_rate: DEFAULT_AFFILIATE_RATE },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ account: data });
  }

  if (action === "payout") {
    // Architecture only: record the payout request (method) for admin processing.
    const { error } = await supabase
      .from("affiliate_accounts")
      .update({ payout_method: payoutMethod ?? null })
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: "Payout request recorded." });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
