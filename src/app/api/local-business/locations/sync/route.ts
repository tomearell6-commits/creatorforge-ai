/**
 * POST /api/local-business/locations/sync { accountId? }
 * Pulls the user's real Google Business Profile locations into
 * local_business_locations (upsert by provider_location_id). Honestly gated:
 * returns "unavailable" until Business Profile API access is approved. Free.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gbpApiConfigured, logLbConnection } from "@/lib/local-business/service";
import { syncLocationsForAccount } from "@/lib/local-business/gbp-api";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!gbpApiConfigured()) {
    return NextResponse.json({
      available: false, synced: 0,
      message: "Syncing locations from Google isn't enabled yet (needs approved Business Profile API access). You can add locations manually in the meantime.",
    });
  }

  const { accountId } = (await request.json().catch(() => ({}))) as { accountId?: string };
  let q = supabase.from("local_business_accounts").select("id, access_token, refresh_token, expires_at").eq("status", "connected");
  if (accountId) q = q.eq("id", accountId);
  const { data: accounts } = await q;
  if (!accounts?.length) return NextResponse.json({ available: true, synced: 0, message: "Connect a Google account first." });

  let total = 0;
  const errors: string[] = [];
  for (const acct of accounts) {
    const r = await syncLocationsForAccount(supabase, user.id, acct);
    if (r.ok) total += r.synced;
    else if (r.error) errors.push(r.error);
  }
  await logLbConnection(supabase, user.id, accountId ?? null, "locations_synced", `${total} location(s)`);

  if (!total && errors.length) return NextResponse.json({ available: true, synced: 0, error: errors[0] });
  return NextResponse.json({ available: true, synced: total, message: `Synced ${total} location${total === 1 ? "" : "s"} from Google.` });
}
