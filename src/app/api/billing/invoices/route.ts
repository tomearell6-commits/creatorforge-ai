import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listInvoices } from "@/lib/billing/invoices";

/** GET /api/billing/invoices?q=&status= — searchable, filterable invoice list. */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").toLowerCase().trim();
  const status = url.searchParams.get("status") ?? "";

  let invoices = await listInvoices(user.id);
  if (status) invoices = invoices.filter((i) => i.status === status);
  if (q) {
    invoices = invoices.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.plan ?? "").toLowerCase().includes(q)
    );
  }
  return NextResponse.json({ invoices });
}
