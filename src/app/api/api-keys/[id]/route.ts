import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/apikeys";
import { logAudit } from "@/lib/audit";

/**
 * PATCH { action: "revoke" | "rotate" } -> revoke or rotate a key.
 * DELETE -> permanently delete a key. (Phase 7 — Module 7)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await request.json();

  if (action === "revoke") {
    const { error } = await supabase.from("api_keys").update({ revoked: true }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logAudit(supabase, { userId: user.id, actorEmail: user.email, action: "apikey.revoked", targetType: "api_key", targetId: id });
    return NextResponse.json({ ok: true });
  }

  if (action === "rotate") {
    const { plaintext, prefix, hash } = generateApiKey();
    const { data, error } = await supabase
      .from("api_keys")
      .update({ key_prefix: prefix, key_hash: hash, revoked: false, request_count: 0 })
      .eq("id", id)
      .select("id, name, key_prefix, scopes, rate_limit, created_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logAudit(supabase, { userId: user.id, actorEmail: user.email, action: "apikey.created", targetType: "api_key", targetId: id, metadata: { rotated: true } });
    return NextResponse.json({ key: data, secret: plaintext });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("api_keys").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
