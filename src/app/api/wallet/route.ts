import { NextResponse } from "next/server";
import { getWalletSummary } from "@/lib/credits/wallet";

/** GET /api/wallet — authoritative, server-computed wallet summary. */
export async function GET() {
  const summary = await getWalletSummary();
  if (!summary) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(summary);
}
