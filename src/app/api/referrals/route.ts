import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Referral program (Phase 7 — Module 4).
 * GET -> ensure the user has a referral code, then return link + stats + history.
 */
function makeCode(userId: string) {
  return "ref" + userId.replace(/-/g, "").slice(0, 8);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure a referral code exists on the profile.
  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("user_id", user.id)
    .maybeSingle();
  let code = profile?.referral_code as string | null;
  if (!code) {
    code = makeCode(user.id);
    await supabase.from("profiles").update({ referral_code: code }).eq("user_id", user.id);
  }

  const { data: referrals } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });
  const { data: rewards } = await supabase
    .from("referral_rewards")
    .select("amount, status")
    .eq("user_id", user.id);

  const converted = (referrals ?? []).filter((r) => r.status === "converted").length;
  const balance = (rewards ?? []).filter((r) => r.status === "granted").reduce((s, r) => s + Number(r.amount), 0);
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.creatorsforge.io";

  return NextResponse.json({
    code,
    link: `${base}/signup?ref=${code}`,
    stats: { total: (referrals ?? []).length, converted, pendingPayout: balance },
    referrals: referrals ?? [],
  });
}
