import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getInfraSnapshot } from "@/lib/infra/status";

/** GET — every provider with a renewal date, sorted soonest-first, with urgency tier. */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const snaps = await getInfraSnapshot(gate.admin);
  const now = Date.now();

  const rows = snaps
    .filter((s) => s.renewal?.renewal_date || s.def.renewalRequired)
    .map((s) => {
      const date = s.renewal?.renewal_date ?? null;
      const days = date ? Math.ceil((new Date(date).getTime() - now) / 86_400_000) : null;
      const tier = days == null ? "unknown" : days <= 7 ? "critical" : days <= 14 ? "warning" : days <= 30 ? "upcoming" : "ok";
      return {
        id: s.def.id, name: s.def.name, category: s.def.category,
        plan: s.renewal?.plan ?? null, renewalDate: date, daysRemaining: days,
        monthlyCost: s.renewal?.monthly_cost ?? s.cost?.monthly_usd ?? null,
        status: s.status, tier,
      };
    })
    .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));

  return NextResponse.json({ renewals: rows });
}
