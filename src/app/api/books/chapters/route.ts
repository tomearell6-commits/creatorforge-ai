import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/respond";

const wc = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** GET ?bookId= — chapters for a book (ordered). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookId = new URL(request.url).searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ error: "Missing bookId." }, { status: 400 });
  const { data } = await supabase.from("book_chapters").select("*").eq("book_id", bookId).eq("user_id", user.id).order("position");
  return NextResponse.json({ chapters: data ?? [] });
}

/** POST — add a chapter. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { bookId?: string; title?: string; part?: string; position?: number };
  if (!b.bookId || !b.title) return NextResponse.json({ error: "bookId and title are required." }, { status: 400 });
  const { data, error } = await supabase.from("book_chapters").insert({
    book_id: b.bookId, user_id: user.id, title: b.title, part: b.part ?? null, position: b.position ?? 999, content: "", word_count: 0,
  }).select("id").single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ id: data!.id });
}

/** PATCH — autosave/update a chapter. Pass snapshot:true to also save a version. */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { id?: string; title?: string; content?: string; notes?: string; status?: string; position?: number; part?: string; snapshot?: boolean };
  if (!b.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["title", "notes", "status", "position", "part"] as const) if (b[k] !== undefined) patch[k] = b[k];
  if (b.content !== undefined) { patch.content = b.content; patch.word_count = wc(b.content); }

  const { error } = await supabase.from("book_chapters").update(patch).eq("id", b.id).eq("user_id", user.id);
  if (error) return apiError(error.message, 500);

  if (b.snapshot && b.content !== undefined) {
    await supabase.from("book_versions").insert({ chapter_id: b.id, user_id: user.id, content: b.content, label: "autosave" });
  }
  return NextResponse.json({ ok: true, wordCount: b.content !== undefined ? wc(b.content) : undefined });
}

/** DELETE ?id= */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await supabase.from("book_chapters").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
