/**
 * POST /api/local-business/disconnect { accountId }
 * Immediately removes the connected Google account and its stored tokens.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logLbConnection } from "@/lib/local-business/service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { accountId } = (await request.json().catch(() => ({}))) as { accountId?: string };
  if (!accountId) return NextResponse.json({ error: "accountId is required." }, { status: 400 });

  // Deleting the account row removes stored (encrypted) tokens via RLS-scoped delete.
  const { error } = await supabase.from("local_business_accounts").delete().eq("id", accountId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logLbConnection(supabase, user.id, accountId, "disconnect");
  return NextResponse.json({ ok: true });
}
