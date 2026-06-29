import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/autopilot/rules?campaignId= */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaignId = new URL(request.url).searchParams.get("campaignId");
  let q = supabase.from("autopilot_rules").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (campaignId) q = q.eq("campaign_id", campaignId);
  const { data } = await q;
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!b.name || !b.rule_type) return NextResponse.json({ error: "name and rule_type are required." }, { status: 400 });
  const { error } = await supabase.from("autopilot_rules").insert({
    user_id: user.id, campaign_id: b.campaign_id ?? null, name: b.name, rule_type: b.rule_type,
    config: b.config ?? {}, enabled: b.enabled ?? true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown> & { id?: string };
  if (!b.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["name", "rule_type", "config", "enabled"]) if (b[k] !== undefined) patch[k] = b[k];
  const { error } = await supabase.from("autopilot_rules").update(patch).eq("id", b.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await supabase.from("autopilot_rules").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
