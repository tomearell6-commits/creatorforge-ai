import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/respond";

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await userClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("browser_bookmarks").select("id,url,title,note,created_at").order("created_at", { ascending: false }).limit(200);
  return NextResponse.json({ bookmarks: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await userClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { url?: string; title?: string; note?: string };
  if (!b.url) return apiError("A URL is required.", 400);
  const { data, error } = await supabase.from("browser_bookmarks")
    .insert({ user_id: user.id, url: b.url, title: b.title ?? null, note: b.note ?? null }).select("id").single();
  if (error) return apiError("Could not save bookmark.", 500);
  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await userClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { id?: string };
  if (!b.id) return apiError("Bookmark id is required.", 400);
  await supabase.from("browser_bookmarks").delete().eq("id", b.id);
  return NextResponse.json({ ok: true });
}
