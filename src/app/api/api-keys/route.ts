import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/apikeys";
import { logAudit } from "@/lib/audit";

/**
 * API Center (Phase 7 — Module 7).
 * GET  -> list the user's keys (never returns the secret).
 * POST -> create a key; returns the plaintext secret ONCE (only the hash is stored).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, scopes, rate_limit, request_count, last_used_at, revoked, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, scopes } = await request.json();
  const { plaintext, prefix, hash } = generateApiKey();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: user.id,
      name: name?.trim() || "API key",
      key_prefix: prefix,
      key_hash: hash,
      scopes: Array.isArray(scopes) ? scopes : [],
    })
    .select("id, name, key_prefix, scopes, rate_limit, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(supabase, {
    userId: user.id, actorEmail: user.email, action: "apikey.created",
    targetType: "api_key", targetId: data.id, metadata: { name: data.name },
  });

  // Plaintext returned exactly once — the client must copy it now.
  return NextResponse.json({ key: data, secret: plaintext });
}
