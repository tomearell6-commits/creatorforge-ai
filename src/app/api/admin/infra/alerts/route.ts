import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getInfraSnapshot } from "@/lib/infra/status";
import { evaluateAlerts, DEFAULT_THRESHOLDS, type Thresholds } from "@/lib/infra/alerts";
import { logAudit } from "@/lib/audit";

/** GET — derived (live) alerts merged with stored, unresolved provider_alerts rows. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const { data: tRow } = await admin.from("provider_thresholds").select("*").eq("id", 1).maybeSingle();
  const thresholds = (tRow as Thresholds) ?? DEFAULT_THRESHOLDS;

  const snaps = await getInfraSnapshot(admin);
  const derived = evaluateAlerts(snaps, thresholds).map((a, i) => ({ ...a, id: `derived:${a.provider_id}:${i}`, resolved: false, source: "live", created_at: new Date().toISOString() }));

  const { data: stored } = await admin
    .from("provider_alerts").select("*").eq("resolved", false).order("created_at", { ascending: false });

  return NextResponse.json({
    alerts: [...derived, ...((stored ?? []).map((s) => ({ ...s, source: "stored" })))],
  });
}

/** POST { id } — resolve a stored alert (derived alerts clear themselves). */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id || id.startsWith("derived:")) {
    return NextResponse.json({ error: "Live alerts resolve automatically when the condition clears." }, { status: 400 });
  }
  const { error } = await admin.from("provider_alerts").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logAudit(admin, { userId: user.id, actorEmail: user.email ?? null, action: "infra.alert.resolved", targetType: "provider_alert", targetId: id, metadata: { resolved: true } });
  return NextResponse.json({ ok: true });
}
