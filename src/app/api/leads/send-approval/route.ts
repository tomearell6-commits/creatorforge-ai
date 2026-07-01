import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";
import { logUsage } from "@/lib/leads/access";

/**
 * POST /api/leads/send-approval — the manual-review confirmation the send route
 * requires. Records an approval row for a campaign confirming the user has
 * reviewed the outreach and confirmed compliance.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await limitRequestAsync(request, "lead-send-approval", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as {
    emailCampaignId?: string;
    listId?: string;
    recipients?: number;
    confirmedCompliance?: boolean;
  };

  if (body.confirmedCompliance !== true)
    return NextResponse.json({ error: "You must confirm the outreach is compliant before approving." }, { status: 400 });
  if (!body.emailCampaignId)
    return NextResponse.json({ error: "Missing emailCampaignId." }, { status: 400 });

  const { error } = await supabase.from("lead_send_approvals").insert({
    user_id: user.id,
    email_campaign_id: body.emailCampaignId,
    list_id: body.listId ?? null,
    recipients: Math.max(0, Number(body.recipients) || 0),
    confirmed_compliance: true,
    approved: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logUsage(supabase, user.id, "send_approval", `campaign ${body.emailCampaignId}`);
  return NextResponse.json({ ok: true });
}
