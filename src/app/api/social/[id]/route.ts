import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Disconnect / refresh a connected social account (Phase 6 — Module 1).
 * DELETE -> disconnect. PATCH { action: "refresh" } -> re-authorize (refresh).
 * RLS guarantees the row belongs to the caller.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("social_accounts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await request.json();
  if (action !== "refresh") return NextResponse.json({ error: "Unsupported action" }, { status: 400 });

  const { data, error } = await supabase
    .from("social_accounts")
    .update({
      status: "connected",
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ account: data });
}
