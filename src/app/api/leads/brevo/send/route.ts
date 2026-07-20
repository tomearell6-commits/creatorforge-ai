import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { LEAD_CREDIT_COSTS } from "@/lib/leads/constants";
import { logCompliance } from "@/lib/leads/compliance";
import { guardLead, logUsage } from "@/lib/leads/access";
import { sendCampaign, willUseBrevo } from "@/lib/leads/brevo";

/**
 * POST /api/leads/brevo/send — send a previously-created Brevo email campaign.
 * Enforces the full premium gate (verified + paid + Business/Enterprise plan +
 * compliance accepted + sender profile + daily limit), requires a prior manual
 * send APPROVAL (review step), records a safety-check row, and blocks with a
 * reason if any check fails. Charges 1 credit per campaignSendPer.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-brevo-send", 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const gate = await guardLead(supabase, user.id, !!user.email_confirmed_at, "send");
  if (gate instanceof NextResponse) return gate;

  const { campaignId } = (await request.json().catch(() => ({}))) as { campaignId?: string };
  if (!campaignId) return NextResponse.json({ error: "Missing campaignId." }, { status: 400 });

  const { data: campaign } = await supabase.from("lead_email_campaigns").select("*").eq("id", campaignId).eq("user_id", user.id).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  if (campaign.status === "sent") return NextResponse.json({ error: "This campaign was already sent." }, { status: 409 });

  const recipients = (campaign.recipients as number) ?? 0;
  const cost = Math.ceil(recipients / LEAD_CREDIT_COSTS.campaignSendPer);

  // Manual-review gate: an approval confirming compliance must exist for this campaign.
  const { data: approval } = await supabase.from("lead_send_approvals").select("approved, confirmed_compliance")
    .eq("user_id", user.id).eq("email_campaign_id", campaignId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const approved = approval?.approved === true && approval?.confirmed_compliance === true;

  // Record the pre-send safety checks (audit) and block if any fail.
  const checks = {
    plan_and_limits: true,                    // guardLead passed
    compliance_accepted: true,                // guardLead passed
    sender_profile_complete: true,            // guardLead passed
    manual_approval: approved,
    within_daily_limit: gate.usage.sendsToday + recipients <= gate.limits.dailySends,
    enough_credits: cost === 0 || (await getCreditBalance()) >= cost,
    brevo_configured: !!campaign.brevo_campaign_id && willUseBrevo(),
    has_recipients: recipients > 0,
  };
  const passed = Object.values(checks).every(Boolean);
  await supabase.from("lead_safety_checks").insert({ user_id: user.id, email_campaign_id: campaignId, checks_json: checks, passed }).then(() => {}, () => {});

  if (!passed) {
    await logUsage(supabase, user.id, "blocked_send", `campaign ${campaignId}`);
    await logCompliance(supabase, user.id, "send", `blocked: ${JSON.stringify(checks)}`, { campaignId });
    if (!checks.manual_approval) return NextResponse.json({ error: "Review and approve this campaign before sending.", reason: "not_approved", action: "review" }, { status: 403 });
    if (!checks.enough_credits) return NextResponse.json({ error: "Not enough credits to send.", code: "insufficient_credits", action: "top_up_credits" }, { status: 402 });
    if (!checks.within_daily_limit) return NextResponse.json({ error: "This send would exceed your plan's daily sending limit." }, { status: 403 });
    if (!checks.brevo_configured) return NextResponse.json({ configured: false });
    return NextResponse.json({ error: "Send blocked by a safety check.", checks }, { status: 400 });
  }

  // H2: atomically claim the campaign so two concurrent requests (double-click,
  // retry) can't both fire the send. Only one request will flip draft/ready →
  // "sending"; the loser gets a 409.
  const { data: claimed } = await supabase.from("lead_email_campaigns")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", campaignId).eq("user_id", user.id).not("status", "in", "(sent,sending)")
    .select("id").maybeSingle();
  if (!claimed) return NextResponse.json({ error: "This campaign is already sending or was sent." }, { status: 409 });

  const result = await sendCampaign(Number(campaign.brevo_campaign_id));
  if (!result.ok) {
    // Release the claim so the user can retry after fixing the Brevo error.
    await supabase.from("lead_email_campaigns").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", campaignId).eq("user_id", user.id);
    return NextResponse.json({ configured: true, error: "Brevo send failed." }, { status: 502 });
  }
  if (cost > 0) await deductCredits(cost, "lead_campaign_send");

  await supabase.from("lead_email_campaigns").update({ status: "sent", sent: recipients, updated_at: new Date().toISOString() }).eq("id", campaignId).eq("user_id", user.id);
  await supabase.from("lead_email_events").insert({ user_id: user.id, campaign_id: campaignId, event: "sent", email: null }).then(() => {}, () => {});
  await logUsage(supabase, user.id, "send", `campaign ${campaignId}: ${recipients}`, recipients);
  await logCompliance(supabase, user.id, "send", `campaign ${campaignId}: ${recipients} recipients`, { campaignId });

  return NextResponse.json({ ok: true, configured: true });
}
