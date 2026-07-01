import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OUTREACH_ELIGIBLE } from "@/lib/leads/constants";
import { guardLead } from "@/lib/leads/access";

/** GET /api/leads/campaigns/status?id= — campaign row (owner) + lead counts. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const gate = await guardLead(supabase, user.id, !!user.email_confirmed_at, "view");
  if (gate instanceof NextResponse) return gate;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const { data: campaign } = await supabase.from("lead_campaigns").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const countFor = async (build: (q: ReturnType<typeof baseQuery>) => ReturnType<typeof baseQuery>) => {
    const { count } = await build(baseQuery());
    return count ?? 0;
  };
  function baseQuery() {
    return supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("campaign_id", id!);
  }

  const [total, verified, invalid, ready] = await Promise.all([
    countFor((q) => q),
    countFor((q) => q.in("verification_status", OUTREACH_ELIGIBLE)),
    countFor((q) => q.eq("verification_status", "invalid")),
    countFor((q) => q.eq("lead_status", "ready")),
  ]);

  return NextResponse.json({ campaign, counts: { total, verified, invalid, ready } });
}
