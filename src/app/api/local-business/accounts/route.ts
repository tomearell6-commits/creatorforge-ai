/**
 * GET /api/local-business/accounts — connected Google accounts + locations for
 * this user (tokens excluded), plus whether live GBP API access is configured.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLbAccounts, getLbLocations, gbpApiConfigured } from "@/lib/local-business/service";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [accounts, locations] = await Promise.all([getLbAccounts(supabase), getLbLocations(supabase)]);
  return NextResponse.json({ accounts, locations, liveApi: gbpApiConfigured() });
}
