import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { apiError } from "@/lib/api/respond";

/** GET — all tutorials (incl. unpublished) + per-tutorial completion counts. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const [{ data }, { data: prog }] = await Promise.all([
    gate.admin.from("tutorials").select("*").order("category").order("sort_order"),
    gate.admin.from("tutorial_progress").select("tutorial_id, completed_at"),
  ]);
  const completions: Record<string, number> = {};
  const starts: Record<string, number> = {};
  for (const p of prog ?? []) {
    starts[p.tutorial_id] = (starts[p.tutorial_id] ?? 0) + 1;
    if (p.completed_at) completions[p.tutorial_id] = (completions[p.tutorial_id] ?? 0) + 1;
  }
  return NextResponse.json({
    tutorials: (data ?? []).map((t) => ({ ...t, _starts: starts[t.id] ?? 0, _completions: completions[t.id] ?? 0 })),
  });
}

/** POST — add a tutorial (video_url can be a Supabase storage URL or any MP4). */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!b.title || !b.video_url) return NextResponse.json({ error: "title and video_url are required." }, { status: 400 });
  const { error } = await gate.admin.from("tutorials").insert({
    title: b.title, description: b.description ?? null, category: b.category ?? "Getting Started",
    video_url: b.video_url, thumbnail_url: b.thumbnail_url ?? null, duration: b.duration ?? null,
    level: b.level ?? "beginner", sort_order: Number(b.sort_order ?? 0), is_published: b.is_published ?? true,
  });
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown> & { id?: string };
  if (!b.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["title", "description", "category", "video_url", "thumbnail_url", "duration", "level", "sort_order", "is_published", "slug", "transcript", "status", "target_route", "cta_label", "cta_url", "version"]) if (b[k] !== undefined) patch[k] = b[k];
  const { error } = await gate.admin.from("tutorials").update(patch).eq("id", b.id);
  if (error) return apiError(error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await gate.admin.from("tutorials").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
