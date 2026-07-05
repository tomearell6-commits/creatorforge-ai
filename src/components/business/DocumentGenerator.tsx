"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Printer, Trash2, Plus } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { DOCUMENT_TYPES } from "@/config/businessOps";

type LineItem = { description: string; qty: number; unitPrice: number };
type DocContent = {
  title: string; intro: string; sections: { heading: string; body: string }[];
  lineItems?: LineItem[]; terms: string; footer: string;
};
type Doc = {
  id: string; doc_type: string; doc_number: string; title: string; recipient: string | null;
  content_json: DocContent; created_at: string;
};

function printDocument(doc: Doc, company: string) {
  const c = doc.content_json;
  const items = c.lineItems?.length
    ? `<table><tr><th>Description</th><th>Qty</th><th>Unit</th><th style="text-align:right">Total</th></tr>${c.lineItems
        .map((i) => `<tr><td>${i.description}</td><td>${i.qty}</td><td>$${i.unitPrice.toFixed(2)}</td><td style="text-align:right">$${(i.qty * i.unitPrice).toFixed(2)}</td></tr>`)
        .join("")}<tr><td colspan="3" style="font-weight:800">Total</td><td style="text-align:right;font-weight:800">$${c.lineItems
        .reduce((s, i) => s + i.qty * i.unitPrice, 0)
        .toFixed(2)}</td></tr></table>`
    : "";
  const w = window.open("", "_blank", "width=760,height=900");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${doc.doc_number}</title><style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:40px;max-width:680px;line-height:1.5}
    .head{display:flex;justify-content:space-between;border-bottom:3px solid #84cc16;padding-bottom:14px}
    .brand{font-weight:800;font-size:20px}.muted{color:#666;font-size:12px}
    h1{font-size:20px;margin:20px 0 4px}h2{font-size:14px;margin:18px 0 4px}
    table{width:100%;border-collapse:collapse;margin:14px 0}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left;font-size:13px}
    .terms{font-size:12px;color:#555;border-top:1px solid #eee;margin-top:20px;padding-top:10px}
    @media print{.noprint{display:none}}
  </style></head><body>
    <div class="head"><div><div class="brand">${company || "Your Company"}</div><div class="muted">${doc.doc_type.replace(/_/g, " ").toUpperCase()}</div></div>
    <div style="text-align:right" class="muted">${doc.doc_number}<br>${new Date(doc.created_at).toLocaleDateString()}${doc.recipient ? `<br>For: ${doc.recipient}` : ""}</div></div>
    <h1>${c.title}</h1><p>${c.intro}</p>
    ${c.sections.map((s) => `<h2>${s.heading}</h2><p>${s.body.replace(/\n/g, "<br>")}</p>`).join("")}
    ${items}
    <div class="terms"><strong>Terms:</strong> ${c.terms}<br><br>${c.footer}</div>
    <button class="noprint" onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#84cc16;border:0;border-radius:8px;font-weight:700;cursor:pointer">Print / Save as PDF</button>
  </body></html>`);
  w.document.close();
}

export function DocumentGenerator({ companyName }: { companyName: string }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [docType, setDocType] = useState("quotation");
  const [form, setForm] = useState({ title: "", recipient: "", details: "" });
  const [items, setItems] = useState<LineItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/business/documents").then((r) => (r.ok ? r.json() : null)).then((d) => setDocs(d?.documents ?? [])).catch(() => setDocs([]));
  }, []);
  useEffect(load, [load]);

  const needsItems = ["quotation", "invoice", "purchase_order"].includes(docType);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/business/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docType, ...form, items: needsItems ? items.filter((i) => i.description) : undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Generation failed."); return; }
    setForm({ title: "", recipient: "", details: "" });
    setItems([]);
    load();
    if (d.document) printDocument(d.document, companyName);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Generate a document</CardTitle>
        <CardDescription className="mt-1">
          AI drafts it from your company profile and the details you give — review the preview before sending anything.
        </CardDescription>
        <form onSubmit={generate} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="doc-type">Type</Label>
              <select id="doc-type" value={docType} onChange={(e) => setDocType(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                {DOCUMENT_TYPES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            <div><Label htmlFor="doc-title">Title</Label><Input id="doc-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div><Label htmlFor="doc-recipient">Recipient</Label><Input id="doc-recipient" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} /></div>
          </div>
          <div>
            <Label htmlFor="doc-details">Details / brief</Label>
            <textarea id="doc-details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={3}
              placeholder="What should this document cover? Facts only — the AI won't invent prices or commitments."
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </div>

          {needsItems && (
            <div className="space-y-2">
              <Label>Line items</Label>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_70px_100px_36px] gap-2">
                  <Input aria-label={`Item ${idx + 1} description`} placeholder="Description" value={item.description}
                    onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} />
                  <Input aria-label={`Item ${idx + 1} quantity`} type="number" min="1" value={item.qty}
                    onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))} />
                  <Input aria-label={`Item ${idx + 1} unit price`} type="number" min="0" step="0.01" value={item.unitPrice}
                    onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, unitPrice: Number(e.target.value) } : x)))} />
                  <Button type="button" variant="ghost" size="sm" aria-label="Remove line item" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="ghost" onClick={() => setItems([...items, { description: "", qty: 1, unitPrice: 0 }])}>
                <Plus className="h-3.5 w-3.5" /> Add line item
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Generating…" : "Generate (5 credits)"}</Button>
        </form>
      </Card>

      {!docs ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : docs.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" description="Quotations, invoices, proposals and more — numbered and print-ready." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-3 font-semibold">Number</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{d.doc_number}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{d.doc_type.replace(/_/g, " ")}</Badge></td>
                  <td className="px-4 py-3">{d.title}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => printDocument(d, companyName)}>
                        <Printer className="h-3.5 w-3.5" /> Print / PDF
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600" aria-label={`Delete ${d.doc_number}`}
                        onClick={() => fetch("/api/business/documents", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: d.id }) }).then(load)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
