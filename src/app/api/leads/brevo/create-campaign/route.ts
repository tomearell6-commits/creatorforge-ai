import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, deductCredits } from "@/lib/credits";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { LEAD_CREDIT_COSTS } from "@/lib/leads/constants";
import { withUnsubscribeFooter } from "@/lib/leads/compliance";
import { guardLead } from "@/lib/leads/access";
import { createEmailCampaign, willUseBrevo } from "@/lib/leads/brevo";

/**
 * POST /api/leads/brevo/create-campaign — build a Brevo email campaign (draft).
 * Body: { templateId, listId, name, brevoListId? }. Adds the mandatory
 * unsubscribe footer. Charges campaignCreate when Brevo is configured.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-brevo-campaign", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const gate = await guardLead(supabase, user.id, !!user.email_confirmed_at, "send");
  if (gate instanceof NextResponse) return gate;

  const b = (await request.json().catch(() => ({}))) as { templateId?: string; listId?: string; name?: string; brevoListId?: number };
  if (!b.templateId || !b.listId) return NextResponse.json({ error: "templateId and listId are required." }, { status: 400 });

  const { data: template } = await supabase.from("lead_outreach_templates").select("*").eq("id", b.templateId).eq("user_id", user.id).maybeSingle();
  if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });

  // H1: the Brevo list id comes from OUR record (set at sync time), never the
  // client — a client-supplied id could target another tenant's contact list.
  const { data: list } = await supabase.from("lead_lists").select("id, brevo_list_id").eq("id", b.listId).eq("user_id", user.id).maybeSingle();
  if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });
  if (!list.brevo_list_id) {
    return NextResponse.json({ error: "Sync this list to Brevo before creating a campaign.", action: "sync" }, { status: 400 });
  }

  // C3: a physical mailing address is legally required in every marketing email
  // (CAN-SPAM). Block the campaign — and never claim it was added — without one.
  const { data: sp } = await supabase.from("lead_sender_profiles")
    .select("business_name, business_email, reply_to_email, business_address").eq("user_id", user.id).maybeSingle();
  if (!sp?.business_address?.trim()) {
    return NextResponse.json({ error: "Add your business mailing address in Lead Settings — it's legally required in every email.", action: "sender_profile" }, { status: 400 });
  }

  const name = (typeof b.name === "string" && b.name.trim()) || (template.name as string) || "Outreach campaign";
  const { count: recipients } = await supabase.from("lead_list_members")
    .select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("list_id", b.listId);

  const htmlContent = withUnsubscribeFooter((template.body as string) ?? "", { businessAddress: sp.business_address });
  const bill = willUseBrevo();

  if (bill && (await getCreditBalance()) < LEAD_CREDIT_COSTS.campaignCreate) {
    return NextResponse.json({ error: "Not enough credits.", code: "insufficient_credits" }, { status: 402 });
  }

  const result = await createEmailCampaign({
    name,
    subject: (template.subject as string) ?? "",
    htmlContent,
    listId: Number(list.brevo_list_id),
    // The FROM must stay the verified Brevo sender (Brevo rejects unverified
    // senders), but replies route to the user's own business inbox (H3).
    senderName: (sp.business_name as string) || (template.sender_name as string) || "CreatorsForge",
    senderEmail: process.env.BREVO_SENDER_EMAIL || "no-reply@creatorsforge.io",
    replyTo: (sp.reply_to_email as string) || (sp.business_email as string) || undefined,
  });

  if (bill && result.configured && result.campaignId != null) {
    await deductCredits(LEAD_CREDIT_COSTS.campaignCreate, "lead_campaign_create");
  }

  const { data: campaign, error } = await supabase.from("lead_email_campaigns").insert({
    user_id: user.id,
    template_id: b.templateId,
    list_id: b.listId,
    brevo_campaign_id: result.campaignId != null ? String(result.campaignId) : null,
    name,
    status: result.configured && result.campaignId != null ? "synced" : "draft",
    recipients: recipients ?? 0,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ campaign, configured: result.configured, brevoError: result.error ?? null });
}
