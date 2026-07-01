import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OUTREACH_ELIGIBLE } from "@/lib/leads/constants";

/** GET /api/leads/reports — dashboard metrics for the signed-in user. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadCount = (build: (q: ReturnType<typeof leadBase>) => ReturnType<typeof leadBase>) =>
    build(leadBase()).then((r) => r.count ?? 0);
  function leadBase() {
    return supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", user!.id);
  }

  const [
    totalLeads, verifiedLeads, invalidEmails, readyForOutreach, campaignsSent,
    { data: emailCampaigns }, { data: searchCampaigns }, { data: recentCampaigns },
  ] = await Promise.all([
    leadCount((q) => q),
    leadCount((q) => q.in("verification_status", OUTREACH_ELIGIBLE)),
    leadCount((q) => q.eq("verification_status", "invalid")),
    leadCount((q) => q.eq("lead_status", "ready")),
    supabase.from("lead_email_campaigns").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "sent").then((r) => r.count ?? 0),
    supabase.from("lead_email_campaigns").select("sent, bounced, unsubscribed").eq("user_id", user.id),
    supabase.from("lead_campaigns").select("credits_used").eq("user_id", user.id),
    supabase.from("lead_email_campaigns").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  let sent = 0, bounced = 0, unsubscribed = 0;
  for (const c of emailCampaigns ?? []) {
    sent += (c.sent as number) ?? 0;
    bounced += (c.bounced as number) ?? 0;
    unsubscribed += (c.unsubscribed as number) ?? 0;
  }
  const creditsUsed = (searchCampaigns ?? []).reduce((s, c) => s + (((c.credits_used as number) ?? 0)), 0);

  return NextResponse.json({
    totalLeads, verifiedLeads, invalidEmails, readyForOutreach, campaignsSent,
    bounceRate: sent > 0 ? bounced / sent : 0,
    unsubscribeRate: sent > 0 ? unsubscribed / sent : 0,
    creditsUsed,
    recentCampaigns: recentCampaigns ?? [],
  });
}
