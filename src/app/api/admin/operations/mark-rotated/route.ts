import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { OPS_PROVIDERS } from "@/lib/operations/registry";
import { maskKey } from "@/lib/operations/status";

export const dynamic = "force-dynamic";

/** POST { keyId, notes? } — mark an API key as rotated today (audited). */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { keyId?: string; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.keyId) return NextResponse.json({ ok: false, message: "keyId is required" }, { status: 400 });

  const { data: row } = await admin.from("operations_provider_keys").select("provider_id, notes").eq("id", body.keyId).maybeSingle();
  if (!row) return NextResponse.json({ ok: false, message: "Key record not found" }, { status: 404 });

  const def = OPS_PROVIDERS.find((p) => p.id === row.provider_id);
  const envName = def?.envKeys.find((k) => !!process.env[k]);

  const { data, error } = await admin
    .from("operations_provider_keys")
    .update({
      last_rotated_at: new Date().toISOString().slice(0, 10),
      status: "healthy",
      masked_value: envName ? maskKey(process.env[envName]!) : undefined,
      notes: body.notes ?? row.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.keyId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.ops.key.rotated", targetType: "operations_provider_key", targetId: String(body.keyId), metadata: { provider: row.provider_id } });
  return NextResponse.json({ ok: true, key: data });
}
