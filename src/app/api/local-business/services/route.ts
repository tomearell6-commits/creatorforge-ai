/**
 * Services manager — GET / POST (create or update) / DELETE. Free.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(request: Request) {
  const { supabase, user } = await auth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locationId = new URL(request.url).searchParams.get("locationId");
  let q = supabase.from("local_business_services").select("*").order("created_at", { ascending: false });
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q;
  return NextResponse.json({ services: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await auth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { id?: string; locationId?: string; name?: string; category?: string; description?: string; price?: string; availability?: string };
  if (!b.name && !b.id) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const row = { user_id: user.id, location_id: b.locationId ?? null, name: b.name, category: b.category ?? null, description: b.description ?? null, price: b.price ?? null, availability: b.availability ?? null, updated_at: new Date().toISOString() };
  const res = b.id
    ? await supabase.from("local_business_services").update(row).eq("id", b.id).select("id").single()
    : await supabase.from("local_business_services").insert(row).select("id").single();
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json({ id: res.data.id });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await auth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const { error } = await supabase.from("local_business_services").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
