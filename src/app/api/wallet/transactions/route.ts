import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/wallet/transactions?status=&month=&year=&limit=
 * Owner-scoped credit transaction history (RLS-enforced).
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const month = url.searchParams.get("month"); // 1-12
  const year = url.searchParams.get("year");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 200);

  let q = supabase
    .from("credit_transactions")
    .select("id, transaction_type, credit_amount, usd_amount, crypto_currency, payment_status, payment_method, payment_reference, transaction_id, package_slug, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) q = q.eq("payment_status", status);
  if (year) {
    const y = Number(year);
    const m = month ? Number(month) : null;
    const start = m ? new Date(Date.UTC(y, m - 1, 1)) : new Date(Date.UTC(y, 0, 1));
    const end = m ? new Date(Date.UTC(y, m, 1)) : new Date(Date.UTC(y + 1, 0, 1));
    q = q.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "Could not load transactions." }, { status: 500 });
  return NextResponse.json({ transactions: data ?? [] });
}
