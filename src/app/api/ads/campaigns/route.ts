import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET — the user's ad campaigns. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("ad_campaigns").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ campaigns: data ?? [] });
}

/** POST — create a campaign (draft). Creating/structuring is free; AI generation is charged. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!b.name || typeof b.name !== "string") return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });

  const { data, error } = await supabase.from("ad_campaigns").insert({
    user_id: user.id, name: b.name, business: b.business ?? null, website: b.website ?? null,
    industry: b.industry ?? null, country: b.country ?? null, language: b.language ?? "en",
    objective: b.objective ?? "traffic", platforms: b.platforms ?? [], creative_types: b.creative_types ?? [],
    audience: b.audience ?? {}, status: b.status ?? "draft", scheduled_at: b.scheduled_at ?? null,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("campaign_history").insert({ user_id: user.id, campaign_id: data!.id, action: "created", detail: `Campaign "${b.name}" created.` });
  return NextResponse.json({ id: data!.id });
}

/** PATCH — update a campaign (status, schedule, fields). */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown> & { id?: string };
  if (!b.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["name", "business", "website", "industry", "country", "language", "objective", "platforms", "creative_types", "audience", "status", "scheduled_at"]) if (b[k] !== undefined) patch[k] = b[k];
  const { error } = await supabase.from("ad_campaigns").update(patch).eq("id", b.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** DELETE ?id= */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await supabase.from("ad_campaigns").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
