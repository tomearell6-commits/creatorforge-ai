import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { OPS_PROVIDERS, isOpsProviderConfigured } from "@/lib/operations/registry";
import { computeSubscriptionStatus } from "@/lib/operations/status";

export const dynamic = "force-dynamic";

/**
 * GET  — provider records. Seeds any registry provider missing from the DB
 *        (idempotent), then returns rows enriched with live `configured` and
 *        computed renewal status. PATCH — update admin-maintained fields.
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const admin = createAdminClient();

  // Seed registry entries not yet in the table.
  const { data: existing } = await admin.from("operations_providers").select("provider_id");
  const known = new Set((existing ?? []).map((r) => r.provider_id));
  const missing = OPS_PROVIDERS.filter((p) => !known.has(p.id)).map((p) => ({
    provider_id: p.id, name: p.name, category: p.category,
    login_url: p.loginUrl ?? null, support_url: p.supportUrl ?? null, docs_url: p.docsUrl ?? null,
  }));
  if (missing.length) await admin.from("operations_providers").insert(missing);

  const { data, error } = await admin
    .from("operations_providers")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const providers = (data ?? []).map((row) => {
    const def = OPS_PROVIDERS.find((p) => p.id === row.provider_id);
    const renewal = computeSubscriptionStatus(row.renewal_date);
    return {
      ...row,
      configured: def ? isOpsProviderConfigured(def) : null,
      renewalStatus: renewal.status,
      daysToRenewal: renewal.daysRemaining,
      creditBased: def?.creditBased ?? false,
      hasWebhook: def?.hasWebhook ?? false,
    };
  });

  return NextResponse.json({ ok: true, providers });
}

const EDITABLE: Record<string, string> = {
  accountEmail: "account_email", currentPlan: "current_plan", monthlyCost: "monthly_cost",
  billingCycle: "billing_cycle", renewalDate: "renewal_date", paymentMethod: "payment_method",
  healthStatus: "health_status", adminNotes: "admin_notes", isActive: "is_active",
  loginUrl: "login_url", supportUrl: "support_url", docsUrl: "docs_url",
};

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { user } = gate;
  const admin = createAdminClient();

  let body: { providerId?: string; [k: string]: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 }); }
  if (!body.providerId) return NextResponse.json({ ok: false, message: "providerId is required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, col] of Object.entries(EDITABLE)) if (k in body) patch[col] = body[k] === "" ? null : body[k];

  const { data, error } = await admin
    .from("operations_providers")
    .update(patch)
    .eq("provider_id", body.providerId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "admin.ops.provider.update", targetType: "operations_provider", targetId: body.providerId });
  return NextResponse.json({ ok: true, provider: data });
}
