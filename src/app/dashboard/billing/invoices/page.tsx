import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceList } from "@/components/billing/InvoiceList";

export const metadata = { title: "Invoices — Billing — CreatorsForge AI" };

export default async function BillingInvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <InvoiceList userEmail={user.email ?? ""} />;
}
