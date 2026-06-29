import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getInfraSnapshot } from "@/lib/infra/status";

/** GET — cost breakdown by provider + totals + simple forecast. Supports ?format=csv. */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const snaps = await getInfraSnapshot(gate.admin);
  const rows = snaps
    .filter((s) => s.cost?.daily_usd != null || s.cost?.monthly_usd != null)
    .map((s) => ({ id: s.def.id, name: s.def.name, category: s.def.category, daily: s.cost?.daily_usd ?? 0, monthly: s.cost?.monthly_usd ?? 0 }))
    .sort((a, b) => b.monthly - a.monthly);

  const totalDaily = Math.round(rows.reduce((a, r) => a + r.daily, 0) * 100) / 100;
  const totalMonthly = Math.round(rows.reduce((a, r) => a + r.monthly, 0) * 100) / 100;
  // Forecast = greater of recorded monthly totals or daily run-rate × 30.
  const forecast = Math.max(totalMonthly, Math.round(totalDaily * 30 * 100) / 100);

  if (new URL(request.url).searchParams.get("format") === "csv") {
    const header = "provider,category,daily_usd,monthly_usd\n";
    const body = rows.map((r) => `${r.name},${r.category},${r.daily},${r.monthly}`).join("\n");
    return new NextResponse(header + body, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=infra-costs.csv" },
    });
  }

  return NextResponse.json({
    byProvider: rows,
    totals: { daily: totalDaily, monthly: totalMonthly, forecastMonthly: forecast },
    topDrivers: rows.slice(0, 5),
  });
}
