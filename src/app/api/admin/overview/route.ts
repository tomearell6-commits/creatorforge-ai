import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAdminOverview } from "@/lib/admin-overview";

/**
 * Super Admin dashboard stats (Phase 7 — Module 1). Platform-wide metrics computed from
 * core + Phase 6/7 tables via the service-role client (logic lives in lib/admin-overview).
 */
export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  return NextResponse.json(await getAdminOverview(gate.admin));
}
