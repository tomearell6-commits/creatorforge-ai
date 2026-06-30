import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET ?chapterId= — version history snapshots for a chapter (newest first). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const chapterId = new URL(request.url).searchParams.get("chapterId");
  if (!chapterId) return NextResponse.json({ error: "Missing chapterId." }, { status: 400 });
  const { data } = await supabase
    .from("book_versions")
    .select("id, content, label, created_at")
    .eq("chapter_id", chapterId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  return NextResponse.json({ versions: data ?? [] });
}
