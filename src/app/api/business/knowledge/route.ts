import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KNOWLEDGE_KINDS } from "@/config/businessOps";

/** AI Knowledge Base — plain-text entries injected into every generator. */
async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: items } = await admin
    .from("business_knowledge").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  return NextResponse.json({ items: items ?? [] });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.title !== "string" || !body.title.trim() || typeof body?.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
  }
  const kind = KNOWLEDGE_KINDS.some((k) => k.id === body.kind) ? body.kind : "document";
  const admin = createAdminClient();
  const { data: created, error } = await admin.from("business_knowledge").insert({
    user_id: user.id,
    kind,
    title: body.title.slice(0, 200),
    content: body.content.slice(0, 20000),
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  return NextResponse.json({ item: created });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, is_active } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || typeof is_active !== "boolean") {
    return NextResponse.json({ error: "id and is_active required" }, { status: 400 });
  }
  const admin = createAdminClient();
  await admin.from("business_knowledge").update({ is_active }).eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = createAdminClient();
  await admin.from("business_knowledge").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
