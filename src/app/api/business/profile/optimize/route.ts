import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { optimizeProfile, willUseRealBusinessAI } from "@/lib/business/ai";
import { scoreProfile } from "@/lib/business/profile";
import { BUSINESS_CREDIT_COSTS, BUSINESS_CREDIT_REASONS } from "@/config/businessOps";
import { logBizActivity } from "@/lib/business/reports";

/** AI profile optimization: score + keywords + rewritten description + advice. */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "biz-optimize", 6, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cost = willUseRealBusinessAI() ? BUSINESS_CREDIT_COSTS.profileOptimize : 0;
  if (cost > 0 && (await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits.", required: cost }, { status: 402 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("company_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Save your company profile first." }, { status: 400 });

  const { result, usedAI } = await optimizeProfile(profile);
  const scoring = scoreProfile(profile);

  await admin.from("company_profiles").update({
    optimization_json: result,
    optimization_score: scoring.score,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);

  if (usedAI && cost > 0) await deductCredits(cost, BUSINESS_CREDIT_REASONS.profileOptimize);
  await logBizActivity(user.id, "profile.optimized", `score ${scoring.score}`, { usedAI });

  return NextResponse.json({ optimization: result, scoring, usedAI, creditsCharged: usedAI ? cost : 0 });
}
