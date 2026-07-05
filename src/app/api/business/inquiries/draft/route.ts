import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { draftInquiryReply, buildCompanyContext, willUseRealBusinessAI } from "@/lib/business/ai";
import { BUSINESS_CREDIT_COSTS, BUSINESS_CREDIT_REASONS } from "@/config/businessOps";
import { logBizActivity } from "@/lib/business/reports";

export const maxDuration = 60;

/** AI Reply Assistant: create a DRAFT reply for one inquiry. Never sends. */
export async function POST(req: Request) {
  const rl = await limitRequestAsync(req, "biz-draft", 15, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { inquiryId, tone = "professional" } = await req.json().catch(() => ({}));
  if (typeof inquiryId !== "string") return NextResponse.json({ error: "inquiryId required" }, { status: 400 });

  const cost = willUseRealBusinessAI() ? BUSINESS_CREDIT_COSTS.inquiryDraft : 0;
  if (cost > 0 && (await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits.", required: cost }, { status: 402 });
  }

  const admin = createAdminClient();
  const { data: inquiry } = await admin
    .from("business_inquiries").select("*").eq("id", inquiryId).eq("user_id", user.id).maybeSingle();
  if (!inquiry) return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });

  const context = await buildCompanyContext(user.id);
  const { draft, usedAI } = await draftInquiryReply(
    { subject: inquiry.subject, message: inquiry.message, customerName: inquiry.customer_name, category: inquiry.category },
    String(tone).slice(0, 30),
    context
  );

  const { data: reply } = await admin.from("inquiry_replies").insert({
    inquiry_id: inquiry.id,
    user_id: user.id,
    draft_text: draft,
    tone: String(tone).slice(0, 30),
    used_ai: usedAI,
  }).select("*").single();

  await admin.from("business_inquiries").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", inquiry.id);
  if (usedAI && cost > 0) await deductCredits(cost, BUSINESS_CREDIT_REASONS.inquiryDraft);
  await logBizActivity(user.id, "inquiry.draft_created", inquiry.subject, { usedAI, sensitive: inquiry.is_sensitive });

  return NextResponse.json({ reply, usedAI, creditsCharged: usedAI ? cost : 0 });
}
