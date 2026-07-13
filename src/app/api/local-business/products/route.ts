/**
 * Products manager — GET (list) / POST (create or update) / DELETE. Free (manual
 * editing). AI descriptions are generated via /optimize or the post generator.
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
  let q = supabase.from("local_business_products").select("*").order("created_at", { ascending: false });
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q;
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await auth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { id?: string; locationId?: string; name?: string; category?: string; description?: string; price?: string; image_url?: string; website_url?: string; availability?: string };
  if (!b.name && !b.id) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const row = { user_id: user.id, location_id: b.locationId ?? null, name: b.name, category: b.category ?? null, description: b.description ?? null, price: b.price ?? null, image_url: b.image_url ?? null, website_url: b.website_url ?? null, availability: b.availability ?? null, updated_at: new Date().toISOString() };
  const res = b.id
    ? await supabase.from("local_business_products").update(row).eq("id", b.id).select("id").single()
    : await supabase.from("local_business_products").insert(row).select("id").single();
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json({ id: res.data.id });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await auth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const { error } = await supabase.from("local_business_products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
