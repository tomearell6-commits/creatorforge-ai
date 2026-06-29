import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getInfraSnapshot } from "@/lib/infra/status";
import { getProvider } from "@/lib/infra/registry";

/**
 * GET /api/admin/infra/providers?category=ai
 * Full snapshot per provider (status + latest usage/cost/balance/renewal/health),
 * enriched with registry metadata. Optionally filtered by category.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const category = new URL(request.url).searchParams.get("category");
  const snaps = await getInfraSnapshot(gate.admin);
  const filtered = category ? snaps.filter((s) => s.def.category === category) : snaps;

  return NextResponse.json({
    providers: filtered.map((s) => {
      const def = getProvider(s.def.id)!;
      return {
        id: def.id, name: def.name, category: def.category, authType: def.authType,
        apiEndpoint: def.apiEndpoint, docsUrl: def.docsUrl, supportUrl: def.supportUrl,
        renewalRequired: def.renewalRequired, note: def.note,
        capabilities: {
          usage: def.supportsUsageReporting, balance: def.supportsBalanceReporting,
          health: def.supportsHealthChecks, webhooks: def.supportsWebhooks,
        },
        configured: s.configured, status: s.status,
        usage: s.usage, cost: s.cost, balance: s.balance, renewal: s.renewal, health: s.health,
      };
    }),
  });
}
