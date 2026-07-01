import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { LEAD_CREDIT_COSTS } from "@/lib/leads/constants";
import { logCompliance } from "@/lib/leads/compliance";
import { sendCampaign, willUseBrevo } from "@/lib/leads/brevo";

/**
 * POST /api/leads/brevo/send — send a previously-created Brevo email campaign.
 * Body: { campaignId } (a lead_email_campaigns id). The Brevo list was already
 * compliance-filtered at sync time. Charges 1 credit per campaignSendPer.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-brevo-send", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const { campaignId } = (await request.json().catch(() => ({}))) as { campaignId?: string };
  if (!campaignId) return NextResponse.json({ error: "Missing campaignId." }, { status: 400 });

  const { data: campaign } = await supabase.from("lead_email_campaigns").select("*").eq("id", campaignId).eq("user_id", user.id).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  if (!campaign.brevo_campaign_id || !willUseBrevo()) return NextResponse.json({ configured: false });

  const recipients = (campaign.recipients as number) ?? 0;
  const cost = Math.ceil(recipients / LEAD_CREDIT_COSTS.campaignSendPer);
  if (cost > 0 && (await getCreditBalance()) < cost) {
    return NextResponse.json({ error: "Not enough credits to send.", code: "insufficient_credits" }, { status: 402 });
  }

  const result = await sendCampaign(Number(campaign.brevo_campaign_id));
  if (!result.configured) return NextResponse.json({ configured: false });
  if (!result.ok) return NextResponse.json({ configured: true, error: "Brevo send failed." }, { status: 502 });

  if (cost > 0) await deductCredits(cost, "lead_campaign_send");

  await supabase.from("lead_email_campaigns").update({ status: "sent", sent: recipients, updated_at: new Date().toISOString() }).eq("id", campaignId).eq("user_id", user.id);
  await supabase.from("lead_email_events").insert({ user_id: user.id, campaign_id: campaignId, event: "sent", email: null }).then(() => {}, () => {});
  await logCompliance(supabase, user.id, "send", `campaign ${campaignId}: ${recipients} recipients`, { campaignId });

  return NextResponse.json({ ok: true, configured: true });
}
