"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type Invoice = {
  id: string; invoiceNumber: string; date: string; plan: string | null;
  description: string; amountUsd: number; status: string; paymentMethod: string;
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  paid: "success", pending: "warning", failed: "danger", refunded: "default",
};

/** Opens a printable invoice in a new window — the browser's built-in
 *  "Save as PDF" produces the PDF, so nothing is uploaded anywhere. */
function printInvoice(inv: Invoice, userEmail: string) {
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${inv.invoiceNumber}</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:40px;max-width:640px}
      .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #84cc16;padding-bottom:16px}
      .brand{font-size:22px;font-weight:800}.brand span{color:#65a30d}
      h1{font-size:16px;margin:24px 0 4px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left;font-size:14px}
      .total{font-size:18px;font-weight:800;text-align:right;margin-top:16px}
      .muted{color:#666;font-size:12px}
      @media print {.noprint{display:none}}
    </style></head><body>
    <div class="head">
      <div><div class="brand">CreatorsForge<span>.io</span></div><div class="muted">The AI Business Operating System<br>www.creatorsforge.io</div></div>
      <div style="text-align:right"><h1 style="margin:0">${inv.status === "paid" ? "INVOICE / RECEIPT" : "INVOICE"}</h1>
      <div class="muted">${inv.invoiceNumber}<br>${new Date(inv.date).toLocaleDateString()}</div></div>
    </div>
    <h1>Billed to</h1><div>${userEmail}</div>
    <table><tr><th>Description</th><th>Plan</th><th>Payment method</th><th style="text-align:right">Amount</th></tr>
    <tr><td>${inv.description}</td><td>${inv.plan ?? "—"}</td><td>${inv.paymentMethod}</td><td style="text-align:right">$${inv.amountUsd.toFixed(2)}</td></tr></table>
    <div class="total">Total: $${inv.amountUsd.toFixed(2)} USD — ${inv.status.toUpperCase()}</div>
    <p class="muted">Thank you for building with CreatorsForge.io. Questions? www.creatorsforge.io/dashboard/billing/support</p>
    <button class="noprint" onclick="window.print()" style="margin-top:24px;padding:10px 20px;background:#84cc16;border:0;border-radius:8px;font-weight:700;cursor:pointer">Print / Save as PDF</button>
    </body></html>`);
  w.document.close();
}

export function InvoiceList({ userEmail }: { userEmail: string }) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    fetch(`/api/billing/invoices?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInvoices(d?.invoices ?? []))
      .catch(() => setInvoices([]));
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search invoices…"
            aria-label="Search invoices"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {!invoices ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : invoices.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices yet" description="Invoices and receipts appear here after your first payment." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{inv.description}</td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">${inv.amountUsd.toFixed(2)}</td>
                  <td className="px-4 py-3 capitalize">{inv.paymentMethod}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[inv.status] ?? "default"}>{inv.status}</Badge></td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => printInvoice(inv, userEmail)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
