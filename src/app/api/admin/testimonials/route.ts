import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/** GET — all testimonials (incl. unpublished) for the admin editor. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { data } = await gate.admin.from("testimonials").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  return NextResponse.json({ testimonials: data ?? [] });
}

/** POST — create a testimonial. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!b.name || !b.quote) return NextResponse.json({ error: "name and quote are required." }, { status: 400 });
  const { error } = await gate.admin.from("testimonials").insert({
    name: b.name, role: b.role ?? null, quote: b.quote, rating: Number(b.rating ?? 5),
    platform: b.platform ?? null, accent: b.accent ?? "sky", avatar_url: b.avatar_url ?? null,
    is_published: b.is_published ?? true, sort_order: Number(b.sort_order ?? 0),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** PATCH — update a testimonial. */
export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown> & { id?: string };
  if (!b.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["name", "role", "quote", "rating", "platform", "accent", "avatar_url", "is_published", "sort_order"]) if (b[k] !== undefined) patch[k] = b[k];
  const { error } = await gate.admin.from("testimonials").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** DELETE ?id= */
export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await gate.admin.from("testimonials").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
