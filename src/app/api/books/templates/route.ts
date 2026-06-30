import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BOOK_TEMPLATES } from "@/lib/books/templates";

/** GET — book starter templates (DB authoritative, constant fallback). */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("book_templates").select("slug, name, category, description").order("sort_order");
    if (data && data.length > 0) return NextResponse.json({ templates: data });
  } catch { /* not migrated yet */ }
  return NextResponse.json({ templates: BOOK_TEMPLATES });
}
