import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { LEAD_CREDIT_COSTS } from "@/lib/leads/constants";
import { logCompliance } from "@/lib/leads/compliance";
import { verifySingleEmail, updateVerificationStatus, rejectInvalidEmails, willUseNeverBounce } from "@/lib/leads/neverbounce";

/**
 * POST /api/leads/verify — verify pending leads' emails.
 * Body: { campaignId?, leadIds? }. Charges emailVerify per email only when a real
 * provider (NeverBounce) runs. Stops gracefully if credits run low mid-batch.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-verify", 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const b = (await request.json().catch(() => ({}))) as { campaignId?: string; leadIds?: string[] };

  // Gather target leads: owner, has an email, not yet conclusively verified.
  let q = supabase.from("leads").select("id, email, verification_status")
    .eq("user_id", user.id).not("email", "is", null).neq("email", "")
    .or("verification_status.in.(unknown,failed),verification_status.is.null");
  if (b.campaignId) q = q.eq("campaign_id", b.campaignId);
  if (Array.isArray(b.leadIds) && b.leadIds.length) q = q.in("id", b.leadIds.slice(0, 500));
  const { data: targets } = await q.limit(500);

  const bill = willUseNeverBounce();
  let verified = 0;
  let stopped = false;

  for (const lead of targets ?? []) {
    if (!lead.email) continue;
    if (bill && (await getCreditBalance()) < LEAD_CREDIT_COSTS.emailVerify) { stopped = true; break; }
    const result = await verifySingleEmail(lead.email);
    await updateVerificationStatus(supabase, user.id, lead.id, result);
    await logCompliance(supabase, user.id, "verify", `${lead.email}: ${result.result}`, { leadId: lead.id, campaignId: b.campaignId });
    if (bill) await deductCredits(LEAD_CREDIT_COSTS.emailVerify, "lead_email_verify");
    verified++;
  }

  await rejectInvalidEmails(supabase, user.id);

  if (stopped) {
    return NextResponse.json(
      { verified, stopped: true, code: "insufficient_credits", error: "Credits ran low — verification stopped. Top up to finish." },
      { status: 402 },
    );
  }
  return NextResponse.json({ verified, stopped });
}
