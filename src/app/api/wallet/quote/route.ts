import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { quoteCustom } from "@/lib/credits/wallet";

/** POST /api/wallet/quote { usd? , credits? } — price a custom top-up (server-side). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { usd?: number; credits?: number };
  const usd = typeof body.usd === "number" ? body.usd : undefined;
  const credits = typeof body.credits === "number" ? body.credits : undefined;
  if (usd == null && credits == null) {
    return NextResponse.json({ error: "Provide a dollar amount or credit amount." }, { status: 400 });
  }

  const q = quoteCustom({ usd, credits });
  if (!q.ok) return NextResponse.json({ error: q.error }, { status: 400 });
  return NextResponse.json(q);
}
