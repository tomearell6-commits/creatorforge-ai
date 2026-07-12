import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("browser_history").select("id,url,title,seo_score,visited_at").order("visited_at", { ascending: false }).limit(50);
  return NextResponse.json({ history: data ?? [] });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { id?: string; all?: boolean };
  if (b.all) await supabase.from("browser_history").delete().eq("user_id", user.id);
  else if (b.id) await supabase.from("browser_history").delete().eq("id", b.id);
  return NextResponse.json({ ok: true });
}
