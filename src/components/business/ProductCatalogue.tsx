"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Package, Sparkles, Trash2, Copy } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Pack = {
  seoDescription: string; marketingCopy: string;
  socialCaptions: { platform: string; caption: string }[];
  faq: { q: string; a: string }[]; comparisonPoints: string[];
  imagePrompt: string; videoPrompt: string;
};
type Product = {
  id: string; name: string; category: string | null; price: number | null; currency: string;
  sku: string | null; description: string | null; status: string; pack_json: Pack | null;
};

export function ProductCatalogue() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", price: "", description: "" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog, setLoading, close } = useConfirm();

  const load = useCallback(() => {
    fetch("/api/business/products").then((r) => (r.ok ? r.json() : null)).then((d) => setProducts(d?.products ?? [])).catch(() => setProducts([]));
  }, []);
  useEffect(load, [load]);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/business/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        category: form.category || undefined,
        price: form.price ? Number(form.price) : undefined,
        description: form.description || undefined,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setError(d.error ?? "Could not add the product."); return; }
    setForm({ name: "", category: "", price: "", description: "" });
    setAdding(false);
    load();
  }

  async function setStatus(p: Product, status: string) {
    await fetch("/api/business/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, status }),
    });
    load();
  }

  async function remove(p: Product) {
    if (!(await confirm({ title: `Delete "${p.name}"?`, description: "The product and its marketing pack are removed." }))) return;
    setLoading(true);
    await fetch("/api/business/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) });
    close();
    load();
  }

  async function generatePack(p: Product) {
    setBusyId(p.id);
    setError(null);
    const res = await fetch("/api/business/products/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: p.id }),
    });
    const d = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) { setError(d.error ?? "Generation failed."); return; }
    setOpenId(p.id);
    load();
  }

  if (!products) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">{products.length} products</p>
        <Button onClick={() => setAdding(!adding)}>{adding ? "Cancel" : "Add product"}</Button>
      </div>

      {adding && (
        <Card>
          <form onSubmit={addProduct} className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="bp-name">Name</Label><Input id="bp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><Label htmlFor="bp-cat">Category</Label><Input id="bp-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label htmlFor="bp-price">Price (USD)</Label><Input id="bp-price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <Label htmlFor="bp-desc">Description</Label>
              <textarea id="bp-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div><Button type="submit">Save product</Button></div>
          </form>
        </Card>
      )}

      {products.length === 0 && !adding ? (
        <EmptyState icon={Package} title="No products yet" description="Add products so AI marketing, quotations and campaigns have something to sell." actionLabel="Add your first product" onAction={() => setAdding(true)} />
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{p.name}</h3>
                    <Badge variant={p.status === "published" ? "success" : p.status === "archived" ? "default" : "warning"}>{p.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[p.category, p.price != null ? `$${p.price}` : null, p.sku].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => generatePack(p)}>
                    <Sparkles className="h-3.5 w-3.5" /> {busyId === p.id ? "Generating…" : p.pack_json ? "Regenerate pack" : "Marketing pack (8cr)"}
                  </Button>
                  {p.pack_json && (
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === p.id ? null : p.id)}>
                      {openId === p.id ? "Hide pack" : "View pack"}
                    </Button>
                  )}
                  {p.status !== "published" ? (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(p, "published")}>Publish</Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(p, "archived")}>Archive</Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {openId === p.id && p.pack_json && <PackView pack={p.pack_json} />}
            </Card>
          ))}
        </div>
      )}
      {dialog}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* no clipboard */ } }}
      className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
    >
      <Copy className="h-3 w-3" /> {done ? "Copied" : "Copy"}
    </button>
  );
}

function PackView({ pack }: { pack: Pack }) {
  return (
    <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:grid-cols-2">
      <div>
        <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase text-muted-foreground">SEO description</p><CopyBtn text={pack.seoDescription} /></div>
        <p className="mt-1 text-sm">{pack.seoDescription}</p>
        <div className="mt-3 flex items-center justify-between"><p className="text-xs font-bold uppercase text-muted-foreground">Marketing copy</p><CopyBtn text={pack.marketingCopy} /></div>
        <p className="mt-1 whitespace-pre-line text-sm">{pack.marketingCopy}</p>
        <p className="mt-3 text-xs font-bold uppercase text-muted-foreground">Differentiators</p>
        <ul className="mt-1 list-inside list-disc text-sm">{pack.comparisonPoints.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>
      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground">Social captions</p>
        <ul className="mt-1 space-y-2">
          {pack.socialCaptions.map((c) => (
            <li key={c.platform} className="rounded-lg bg-muted/50 p-2 text-sm">
              <span className="font-semibold">{c.platform}:</span> {c.caption} <CopyBtn text={c.caption} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-bold uppercase text-muted-foreground">FAQ</p>
        <ul className="mt-1 space-y-1.5 text-sm">
          {pack.faq.map((f) => (
            <li key={f.q}><span className="font-semibold">{f.q}</span> <span className="text-muted-foreground">{f.a}</span></li>
          ))}
        </ul>
        <div className="mt-3 rounded-lg border border-border p-2 text-xs">
          <p className="font-semibold">Ready-to-use AI prompts</p>
          <p className="mt-1 text-muted-foreground">Image: {pack.imagePrompt} <CopyBtn text={pack.imagePrompt} /></p>
          <p className="mt-1 text-muted-foreground">Video: {pack.videoPrompt} <CopyBtn text={pack.videoPrompt} /></p>
          <p className="mt-2">
            <Link href="/dashboard/design/new" className="text-brand-600 hover:underline">Generate image →</Link>{" "}
            · <Link href="/dashboard/create?group=video" className="text-brand-600 hover:underline">Generate video →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
