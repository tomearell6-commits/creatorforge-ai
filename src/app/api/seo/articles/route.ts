import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** List the user's SEO articles (newest first). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("seo_articles")
    .select("id, main_keyword, seo_title, slug, status, category, scheduled_at, published_at, wordpress_site_id, seo_score, readability_score, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ articles: data ?? [] });
}
