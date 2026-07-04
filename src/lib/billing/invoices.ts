/**
 * Invoice records — numbered receipts for every completed payment.
 * Created from the payment webhooks (idempotent on the provider reference);
 * older purchases that predate the Billing Center are synthesized read-only so
 * the invoice list is complete without backfilling rows.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/constants";

export type InvoiceItem = {
  id: string;
  invoiceNumber: string;
  date: string;
  plan: string | null;
  description: string;
  amountUsd: number;
  status: "paid" | "pending" | "failed" | "refunded";
  paymentMethod: string;
  synthetic?: boolean; // legacy purchase without a stored invoice row
};

/** Next sequential number: CF-<year>-<6 digits>. */
export async function nextInvoiceNumber(): Promise<string> {
  const admin = createAdminClient();
  const year = new Date().getUTCFullYear();
  const { count } = await admin
    .from("invoice_records")
    .select("id", { count: "exact", head: true })
    .like("invoice_number", `CF-${year}-%`);
  return `CF-${year}-${String((count ?? 0) + 1).padStart(6, "0")}`;
}

/**
 * Record a paid invoice + billing history entry. Idempotent per reference —
 * calling twice with the same provider reference inserts nothing.
 */
export async function recordInvoice(params: {
  userId: string;
  description: string;
  amountUsd: number;
  planId?: string | null;
  paymentMethod: string;              // 'crypto' | 'paddle'
  reference: string;                  // provider payment id (unique)
  eventType?: "upgrade" | "downgrade" | "renewal" | "topup";
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("invoice_records").select("invoice_number").eq("reference", params.reference).maybeSingle();
  if (existing) return existing.invoice_number;

  const invoiceNumber = await nextInvoiceNumber();
  const { error } = await admin.from("invoice_records").insert({
    user_id: params.userId,
    invoice_number: invoiceNumber,
    plan_id: params.planId ?? null,
    description: params.description,
    amount_usd: params.amountUsd,
    status: "paid",
    payment_method: params.paymentMethod,
    reference: params.reference,
    metadata: params.metadata ?? {},
  });
  if (error) return null; // unique-race on reference → another writer won; fine

  await admin.from("billing_history").insert({
    user_id: params.userId,
    event_type: params.eventType ?? "topup",
    description: params.description,
    amount_usd: params.amountUsd,
    plan_id: params.planId ?? null,
    metadata: { invoice: invoiceNumber, reference: params.reference },
  });
  return invoiceNumber;
}

/** Stored invoices + synthesized entries for pre-Billing-Center purchases. */
export async function listInvoices(userId: string): Promise<InvoiceItem[]> {
  const admin = createAdminClient();
  const [{ data: stored }, { data: purchases }] = await Promise.all([
    admin.from("invoice_records")
      .select("id, invoice_number, invoice_date, plan_id, description, amount_usd, status, payment_method, reference")
      .eq("user_id", userId)
      .order("invoice_date", { ascending: false })
      .limit(200),
    admin.from("credit_purchases")
      .select("id, credits, usd_amount, status, payment_reference, created_at, package_slug")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const covered = new Set((stored ?? []).map((r) => r.reference).filter(Boolean));
  const items: InvoiceItem[] = (stored ?? []).map((r) => ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    date: r.invoice_date,
    plan: r.plan_id ? (PLANS.find((p) => p.id === r.plan_id)?.name ?? r.plan_id) : null,
    description: r.description,
    amountUsd: Number(r.amount_usd),
    status: r.status as InvoiceItem["status"],
    paymentMethod: r.payment_method,
  }));

  for (const p of purchases ?? []) {
    if (p.payment_reference && covered.has(p.payment_reference)) continue;
    items.push({
      id: p.id,
      invoiceNumber: `RCPT-${p.id.slice(0, 8).toUpperCase()}`,
      date: p.created_at,
      plan: p.package_slug ? (PLANS.find((x) => x.id === p.package_slug)?.name ?? null) : null,
      description: p.package_slug
        ? `${PLANS.find((x) => x.id === p.package_slug)?.name ?? p.package_slug} plan purchase (${p.credits.toLocaleString()} credits)`
        : `Credit top-up (${p.credits.toLocaleString()} credits)`,
      amountUsd: Number(p.usd_amount),
      status: "paid",
      paymentMethod: "crypto",
      synthetic: true,
    });
  }

  return items.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}
