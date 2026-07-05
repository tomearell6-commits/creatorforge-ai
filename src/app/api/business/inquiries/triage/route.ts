import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { triageInquiries, buildCompanyContext, willUseRealBusinessAI } from "@/lib/business/ai";
import { BUSINESS_CREDIT_COSTS, BUSINESS_CREDIT_REASONS } from "@/config/businessOps";
import { logBizActivity } from "@/lib/business/reports";

export const maxDuration = 60;

/** AI triage for untriaged inquiries — ONE batched call, up to 25 at a time. */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "biz-triage", 6, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cost = willUseRealBusinessAI() ? BUSINESS_CREDIT_COSTS.inquiryTriage : 0;
  if (cost > 0 && (await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits.", required: cost }, { status: 402 });
  }

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("business_inquiries")
    .select("id, subject, message, customer_name")
    .eq("user_id", user.id)
    .is("category", null)
    .in("status", ["new", "in_progress"])
    .order("created_at", { ascending: true })
    .limit(25);

  if (!pending?.length) return NextResponse.json({ triaged: 0, creditsCharged: 0 });

  const context = await buildCompanyContext(user.id);
  const { results, usedAI } = await triageInquiries(
    pending.map((p) => ({ subject: p.subject, message: p.message, customerName: p.customer_name })),
    context
  );

  for (let i = 0; i < pending.length; i++) {
    const r = results[i];
    if (!r) continue;
    await admin.from("business_inquiries").update({
      category: r.category,
      priority: r.priority,
      is_sensitive: r.isSensitive,
      ai_summary: r.summary,
      ai_recommendation: r.recommendation,
      updated_at: new Date().toISOString(),
    }).eq("id", pending[i].id);
  }

  if (usedAI && cost > 0) await deductCredits(cost, BUSINESS_CREDIT_REASONS.inquiryTriage);
  await logBizActivity(user.id, "inquiry.triaged", `${pending.length} inquiries`, { usedAI });

  return NextResponse.json({ triaged: pending.length, usedAI, creditsCharged: usedAI ? cost : 0 });
}
