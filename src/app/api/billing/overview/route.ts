import { NextResponse } from "next/server";
import { getBillingOverview } from "@/lib/billing/overview";

/** GET /api/billing/overview — the Overview page payload. */
export async function GET() {
  const overview = await getBillingOverview();
  if (!overview) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(overview);
}
