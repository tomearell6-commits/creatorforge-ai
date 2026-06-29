import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getInfraSnapshot, summarize } from "@/lib/infra/status";
import { evaluateAlerts, DEFAULT_THRESHOLDS, type Thresholds } from "@/lib/infra/alerts";

async function loadThresholds(admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>): Promise<Thresholds> {
  const { data } = await admin.from("provider_thresholds").select("*").eq("id", 1).maybeSingle();
  return (data as Thresholds) ?? DEFAULT_THRESHOLDS;
}

/** GET — full operations-center overview: summary cards + providers + live alerts. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const thresholds = await loadThresholds(admin);
  const snaps = await getInfraSnapshot(admin);
  const overview = summarize(snaps, thresholds.renewal_reminder_days);
  const derivedAlerts = evaluateAlerts(snaps, thresholds);

  // Lightweight widget data.
  const topSpender = [...snaps].sort((a, b) => (b.cost?.monthly_usd ?? 0) - (a.cost?.monthly_usd ?? 0))[0];
  const lowestBalance = snaps.filter((s) => s.balance?.amount != null).sort((a, b) => (a.balance!.amount ?? 0) - (b.balance!.amount ?? 0))[0];
  const mostUsed = [...snaps].sort((a, b) => (b.usage?.calls_month ?? 0) - (a.usage?.calls_month ?? 0))[0];

  return NextResponse.json({
    overview,
    alertCount: derivedAlerts.length,
    widgets: {
      topSpender: topSpender?.cost?.monthly_usd ? { id: topSpender.def.id, name: topSpender.def.name, monthly: topSpender.cost.monthly_usd } : null,
      lowestBalance: lowestBalance ? { id: lowestBalance.def.id, name: lowestBalance.def.name, amount: lowestBalance.balance?.amount, currency: lowestBalance.balance?.currency } : null,
      mostUsed: mostUsed?.usage?.calls_month ? { id: mostUsed.def.id, name: mostUsed.def.name, calls: mostUsed.usage.calls_month } : null,
    },
    providers: snaps.map(slim),
  });
}

function slim(s: Awaited<ReturnType<typeof getInfraSnapshot>>[number]) {
  return {
    id: s.def.id, name: s.def.name, category: s.def.category, configured: s.configured, status: s.status,
    usage: s.usage, cost: s.cost, balance: s.balance, renewal: s.renewal, health: s.health,
  };
}
