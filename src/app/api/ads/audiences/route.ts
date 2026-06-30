import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET — saved audiences. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("campaign_audiences").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ audiences: data ?? [] });
}

/** POST — save an audience. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!b.name) return NextResponse.json({ error: "Audience name is required." }, { status: 400 });
  const { error } = await supabase.from("campaign_audiences").insert({
    user_id: user.id, name: b.name, country: b.country ?? null,
    age_min: b.age_min ?? null, age_max: b.age_max ?? null, gender: b.gender ?? null,
    languages: b.languages ?? [], interests: b.interests ?? [], audience_type: b.audience_type ?? "interest",
  });
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
  await supabase.from("campaign_audiences").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
