import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitRequestAsync } from "@/lib/security/ratelimit";

/** GET /api/leads/lists — the user's lists with member counts. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: lists } = await supabase.from("lead_lists").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  const withCounts = await Promise.all((lists ?? []).map(async (l) => {
    const { count } = await supabase.from("lead_list_members").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("list_id", l.id);
    return { ...l, member_count: count ?? 0 };
  }));
  return NextResponse.json({ lists: withCounts });
}

/**
 * POST /api/leads/lists — create a list, or add leads to one.
 * Body: { name, description } to create, or { action:"add", listId, leadIds:[] }.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-list-write", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const b = (await request.json().catch(() => ({}))) as { action?: string; listId?: string; leadIds?: string[]; name?: string; description?: string };

  if (b.action === "add") {
    if (!b.listId || !Array.isArray(b.leadIds) || b.leadIds.length === 0) {
      return NextResponse.json({ error: "listId and leadIds are required." }, { status: 400 });
    }
    const { data: list } = await supabase.from("lead_lists").select("id").eq("id", b.listId).eq("user_id", user.id).maybeSingle();
    if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });

    // Only add leads the user actually owns.
    const { data: ownedLeads } = await supabase.from("leads").select("id").eq("user_id", user.id).in("id", b.leadIds.slice(0, 500));
    const rows = (ownedLeads ?? []).map((l) => ({ user_id: user.id, list_id: b.listId, lead_id: l.id }));
    if (rows.length === 0) return NextResponse.json({ added: 0 });

    const { error } = await supabase.from("lead_list_members").upsert(rows, { onConflict: "list_id,lead_id", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ added: rows.length });
  }

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "List name is required." }, { status: 400 });
  const { data, error } = await supabase.from("lead_lists").insert({ user_id: user.id, name, description: b.description ?? null }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ list: data });
}

/** PATCH /api/leads/lists — rename / re-describe a list by id. */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-list-write", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const b = (await request.json().catch(() => ({}))) as { id?: string; name?: string; description?: string };
  if (!b.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string") patch.name = b.name.trim();
  if ("description" in b) patch.description = b.description ?? null;

  const { data, error } = await supabase.from("lead_lists").update(patch).eq("id", b.id).eq("user_id", user.id).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "List not found." }, { status: 404 });
  return NextResponse.json({ list: data });
}

/** DELETE /api/leads/lists?id= — delete a list (members cascade). */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await limitRequestAsync(request, "lead-list-write", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const { error } = await supabase.from("lead_lists").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
