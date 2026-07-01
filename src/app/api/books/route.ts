import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/respond";

/** GET — the user's books (My Books). Supports ?status= filter. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = new URL(request.url).searchParams.get("status");
  let q = supabase.from("books").select("id, title, subtitle, category, status, favorite, cover_url, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return NextResponse.json({ books: data ?? [] });
}

/** POST — create a book (from the wizard). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!b.title || typeof b.title !== "string") return NextResponse.json({ error: "Book title is required." }, { status: 400 });
  const { data, error } = await supabase.from("books").insert({
    user_id: user.id, title: b.title, subtitle: b.subtitle ?? null, author_name: b.author_name ?? null,
    language: b.language ?? "en", category: b.category ?? null, audience: b.audience ?? null,
    writing_style: b.writing_style ?? null, tone: b.tone ?? null, reading_level: b.reading_level ?? null,
    target_words: b.target_words ?? null, status: "draft",
  }).select("id").single();
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ id: data!.id });
}

/** PATCH — update book fields (status, favorite, concept, etc.). */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown> & { id?: string };
  if (!b.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["title", "subtitle", "author_name", "language", "category", "audience", "writing_style", "tone", "reading_level", "target_words", "concept", "description", "objectives", "usps", "status", "favorite", "cover_url"]) if (b[k] !== undefined) patch[k] = b[k];
  const { error } = await supabase.from("books").update(patch).eq("id", b.id).eq("user_id", user.id);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ ok: true });
}

/** DELETE ?id= */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await supabase.from("books").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
