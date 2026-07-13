/**
 * GET  /api/local-business/locations       — list locations (optionally ?accountId=)
 * POST /api/local-business/locations        — manually add/edit a location (free)
 * Manual entry lets users audit + plan content before live GBP API access exists.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLbLocations } from "@/lib/local-business/service";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accountId = new URL(request.url).searchParams.get("accountId") ?? undefined;
  const locations = await getLbLocations(supabase, accountId);
  return NextResponse.json({ locations });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as {
    id?: string; business_name?: string; address?: string; phone?: string; website?: string;
    primary_category?: string; description?: string; appointment_url?: string;
  };
  if (!b.business_name && !b.id) return NextResponse.json({ error: "Business name is required." }, { status: 400 });

  const row = {
    user_id: user.id, business_name: b.business_name, address: b.address ?? null, phone: b.phone ?? null,
    website: b.website ?? null, primary_category: b.primary_category ?? null, description: b.description ?? null,
    appointment_url: b.appointment_url ?? null, connection_status: "manual", profile_status: "needs_attention",
    updated_at: new Date().toISOString(),
  };
  const res = b.id
    ? await supabase.from("local_business_locations").update(row).eq("id", b.id).select("id").single()
    : await supabase.from("local_business_locations").insert(row).select("id").single();
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json({ id: res.data.id });
}
