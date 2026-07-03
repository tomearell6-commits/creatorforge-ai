import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { OPS_PROVIDERS } from "@/lib/operations/registry";
import { computeWebhookStatus } from "@/lib/operations/status";

export const dynamic = "force-dynamic";

/** Webhook health. GET seeds webhook-bearing providers + computes; PATCH records events/resets. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  const hookProviders = OPS_PROVIDERS.filter((p) => p.hasWebhook);
  const { data: existing } = await admin.from("operations_webhook_health").select("provider_id");
  const known = new Set((existing ?? []).map((r) => r.provider_id));
  const missing = hookProviders.filter((p) => !known.has(p.id)).map((p) => ({ provider_id: p.id, webhook_path: p.webhookPath ?? null }));
  if (missing.length) await admin.from("operations_webhook_health").insert(missing);

  const { data, error } = await admin.from("operations_webhook_health").select("*").order("provider_id");
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const webhooks = (data ?? []).map((row) => ({
    ...row,
    computedStatus: computeWebhookStatus(row.failure_count ?? 0, row.last_success_at, row.last_failure_at),
    name: OPS_PROVIDERS.find((p) => p.id === row.provider_id)?.name ?? row.provider_id,
  }));
  return NextResponse.json({ ok: true, webhooks });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { providerId?: string; action?: string; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.providerId) return NextResponse.json({ ok: false, message: "providerId is required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.action === "reset_failures") { patch.failure_count = 0; patch.status = "healthy"; }
  if (body.action === "record_success") { patch.last_success_at = new Date().toISOString(); patch.failure_count = 0; patch.status = "healthy"; }
  if (body.notes !== undefined) patch.notes = body.notes;

  const { data, error } = await admin
    .from("operations_webhook_health")
    .update(patch)
    .eq("provider_id", body.providerId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: `admin.ops.webhook.${body.action ?? "update"}`, targetType: "operations_webhook_health", targetId: body.providerId });
  return NextResponse.json({ ok: true, webhook: data });
}
