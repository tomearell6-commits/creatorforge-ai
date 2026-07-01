"use client";

import { useCallbackQuote, useWallet } from "./wallet-hooks";
import { useEffect, useMemo, useState } from "react";
import {
  Wallet, Plus, Gift, ShoppingBag, RefreshCw, Check, Clock, ExternalLink, Settings2,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { SUPPORTED_CRYPTO, MIN_PURCHASE_USD, MAX_PURCHASE_USD } from "@/lib/constants";

type Pkg = { slug: string; name: string; usdPrice: number; credits: number; bonus: number; tag?: string };
type Txn = {
  id: string; transaction_type: string; credit_amount: number; usd_amount: number | null;
  crypto_currency: string | null; payment_status: string; payment_method: string | null;
  payment_reference: string | null; transaction_id: string | null; created_at: string;
};
type ActiveTopup = {
  credits: number; total: number; currency: string | null; invoiceUrl: string | null;
  expiresAt: string; simulated: boolean; note?: string; orderReference: string;
};

export function WalletClient() {
  const { summary, refresh } = useWallet();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [coin, setCoin] = useState<string>("USDT");
  const [active, setActive] = useState<ActiveTopup | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Filters for history
  const now = new Date();
  const [fStatus, setFStatus] = useState("");
  const [fYear, setFYear] = useState(String(now.getFullYear()));
  const [fMonth, setFMonth] = useState("");

  useEffect(() => {
    fetch("/api/wallet/packages").then((r) => r.json()).then((d) => setPackages(d.packages ?? []));
  }, []);

  const loadTxns = useMemo(() => async () => {
    const qs = new URLSearchParams();
    if (fStatus) qs.set("status", fStatus);
    if (fYear) qs.set("year", fYear);
    if (fMonth) qs.set("month", fMonth);
    const r = await fetch(`/api/wallet/transactions?${qs.toString()}`);
    const d = await r.json();
    setTxns(d.transactions ?? []);
  }, [fStatus, fYear, fMonth]);

  useEffect(() => { loadTxns(); }, [loadTxns]);

  // Poll wallet + history while a top-up is open (webhook credits server-side).
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => { refresh(); loadTxns(); }, 15000);
    return () => clearInterval(t);
  }, [active, refresh, loadTxns]);

  async function buy(body: Record<string, unknown>) {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/wallet/topup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, currency: coin }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not start top-up."); return; }
      setActive({
        credits: d.credits, total: d.total, currency: d.currency, invoiceUrl: d.invoiceUrl,
        expiresAt: d.expiresAt, simulated: d.simulated, note: d.note, orderReference: d.orderReference,
      });
      loadTxns();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-8">
      <WalletSummaryCard summary={summary} />

      {active && <CheckoutPanel active={active} coin={coin} onClose={() => { setActive(null); refresh(); loadTxns(); }} />}

      {err && <Alert variant="error">{err}</Alert>}

      {/* Coin selector */}
      <Card className="space-y-3">
        <CardTitle className="text-base">Pay with</CardTitle>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_CRYPTO.map((c) => (
            <button key={c.code} onClick={() => setCoin(c.code)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                coin === c.code ? "border-brand-500 bg-brand-50 font-semibold text-brand-800" : "border-border hover:bg-muted"}`}>
              <span className="mr-1">{c.emoji}</span>{c.code}
            </button>
          ))}
        </div>
      </Card>

      {/* Packages */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Top-Up Packages</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.slug} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                {p.tag && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">{p.tag}</span>}
              </div>
              <p className="text-3xl font-bold">${p.usdPrice}</p>
              <p className="text-sm text-muted-foreground">
                {(p.credits + (p.bonus ?? 0)).toLocaleString()} credits
                {p.bonus ? <span className="text-brand-700"> (incl. {p.bonus.toLocaleString()} bonus)</span> : null}
              </p>
              <Button disabled={busy} onClick={() => buy({ packageSlug: p.slug })} className="mt-auto">
                {busy ? <Spinner size="sm" className="text-current" /> : <Plus className="h-4 w-4" />} Buy with {coin}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <CustomPurchase coin={coin} busy={busy} onBuy={buy} />

      <AutoTopup packages={packages} />

      {/* Transactions */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Transactions</h2>
        <Card className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select aria-label="Filter transactions by status" value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">All statuses</option>
              {["pending", "confirming", "completed", "failed", "refunded"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select aria-label="Filter transactions by month" value={fMonth} onChange={(e) => setFMonth(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">All months</option>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("en", { month: "long" })}</option>)}
            </select>
            <Input aria-label="Filter transactions by year" value={fYear} onChange={(e) => setFYear(e.target.value)} className="h-9 w-24" placeholder="Year" />
          </div>

          {txns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3">Date</th><th className="pr-3">Type</th><th className="pr-3">Credits</th>
                    <th className="pr-3">Amount</th><th className="pr-3">Currency</th><th className="pr-3">Status</th><th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="pr-3 capitalize">{t.transaction_type}</td>
                      <td className={`pr-3 font-medium ${t.credit_amount >= 0 ? "text-brand-700" : "text-red-600"}`}>
                        {t.credit_amount >= 0 ? "+" : ""}{t.credit_amount.toLocaleString()}
                      </td>
                      <td className="pr-3">{t.usd_amount != null ? `$${Number(t.usd_amount).toFixed(2)}` : "—"}</td>
                      <td className="pr-3">{t.crypto_currency ?? "—"}</td>
                      <td className="pr-3"><StatusPill status={t.payment_status} /></td>
                      <td className="max-w-[160px] truncate text-xs text-muted-foreground">{t.transaction_id || t.payment_reference || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function WalletSummaryCard({ summary }: { summary: ReturnType<typeof useWallet>["summary"] }) {
  if (!summary) return <Card><Spinner size="md" className="text-muted-foreground" /></Card>;
  const pct = Math.round(summary.remainingFraction * 100);
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-brand-600" />
          <div>
            <p className="text-sm text-muted-foreground">Credits remaining</p>
            <p className="text-3xl font-bold">{summary.creditsRemaining.toLocaleString()}</p>
          </div>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-sm capitalize text-muted-foreground">{summary.planName} plan</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Mini icon={<RefreshCw className="h-4 w-4" />} label="Monthly" v={summary.monthlyRemaining} />
        <Mini icon={<Gift className="h-4 w-4" />} label="Bonus" v={summary.bonusCredits} />
        <Mini icon={<ShoppingBag className="h-4 w-4" />} label="Purchased" v={summary.purchasedCredits} />
        <Mini icon={<Check className="h-4 w-4" />} label="Used" v={summary.usedCredits} />
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Renews</p>
          <p className="mt-0.5 text-sm font-semibold">{summary.renewalDate ? new Date(summary.renewalDate).toLocaleDateString() : "—"}</p>
        </div>
      </div>
    </Card>
  );
}

function Mini({ icon, label, v }: { icon: React.ReactNode; label: string; v: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{v.toLocaleString()}</p>
    </div>
  );
}

function CustomPurchase({ coin, busy, onBuy }: { coin: string; busy: boolean; onBuy: (b: Record<string, unknown>) => void }) {
  const [mode, setMode] = useState<"usd" | "credits">("usd");
  const [val, setVal] = useState("");
  const quote = useCallbackQuote(mode, val);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Custom Amount</h2>
      <Card className="space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setMode("usd")} className={`rounded-lg border px-3 py-1.5 text-sm ${mode === "usd" ? "border-brand-500 bg-brand-50 font-semibold" : "border-border"}`}>By dollars</button>
          <button onClick={() => setMode("credits")} className={`rounded-lg border px-3 py-1.5 text-sm ${mode === "credits" ? "border-brand-500 bg-brand-50 font-semibold" : "border-border"}`}>By credits</button>
        </div>
        <div>
          <Label htmlFor="wc-custom-amount">{mode === "usd" ? `Amount in USD (min $${MIN_PURCHASE_USD}, max $${MAX_PURCHASE_USD})` : "Number of credits"}</Label>
          <Input id="wc-custom-amount" type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder={mode === "usd" ? "25" : "3000"} />
        </div>
        {quote && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            {quote.ok ? (
              <ul className="space-y-1">
                <li>Estimated credits: <b>{quote.credits.toLocaleString()}</b></li>
                <li>Estimated cost: <b>${quote.usd.toFixed(2)}</b></li>
                <li>Processing fee: <b>${quote.fee.toFixed(2)}</b></li>
                <li className="border-t border-border pt-1">Total: <b>${quote.total.toFixed(2)}</b></li>
              </ul>
            ) : <p className="text-amber-700">{quote.error}</p>}
          </div>
        )}
        <Button disabled={busy || !quote?.ok} onClick={() => onBuy(mode === "usd" ? { usd: Number(val) } : { credits: Number(val) })}>
          <Plus className="h-4 w-4" /> Buy with {coin}
        </Button>
      </Card>
    </section>
  );
}

function CheckoutPanel({ active, coin, onClose }: { active: ActiveTopup; coin: string; onClose: () => void }) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const t = setInterval(() => {
      const ms = new Date(active.expiresAt).getTime() - Date.now();
      if (ms <= 0) { setLeft("expired"); return; }
      const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
      setLeft(`${m}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(t);
  }, [active.expiresAt]);

  return (
    <Card className="space-y-4 border-brand-300 bg-brand-50/40">
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> Complete your payment</CardTitle>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:underline">Close</button>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div>Coin: <b>{active.currency ?? coin}</b></div>
        <div>Amount due: <b>${active.total.toFixed(2)}</b></div>
        <div>Credits: <b>{active.credits.toLocaleString()}</b></div>
        <div>Time remaining: <b>{left || "—"}</b></div>
      </div>
      {active.invoiceUrl ? (
        <Button asChild variant="accent">
          <a href={active.invoiceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open payment page</a>
        </Button>
      ) : (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {active.note ?? "Payment provider not configured — preview mode."}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Status updates automatically after the blockchain confirms your payment. Credits are added to your wallet once confirmed — you can leave this page.
      </p>
    </Card>
  );
}

function AutoTopup({ packages }: { packages: Pkg[] }) {
  const [s, setS] = useState<{ auto_topup_enabled: boolean; threshold_credits: number; package_slug: string | null; preferred_currency: string; confirm_required: boolean } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetch("/api/wallet/settings").then((r) => r.json()).then((d) => setS(d.settings)); }, []);
  if (!s) return null;

  async function save() {
    setSaved(false);
    await fetch("/api/wallet/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Settings2 className="h-5 w-5" /> Auto Top-Up</h2>
      <Card className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.auto_topup_enabled} onChange={(e) => setS({ ...s, auto_topup_enabled: e.target.checked })} />
          Automatically top up when my balance is low
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="wc-trigger-when-credits-fall-below">Trigger when credits fall below</Label>
            <Input id="wc-trigger-when-credits-fall-below" type="number" value={s.threshold_credits} onChange={(e) => setS({ ...s, threshold_credits: Number(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="wc-top-up-package">Top-up package</Label>
            <select id="wc-top-up-package" value={s.package_slug ?? ""} onChange={(e) => setS({ ...s, package_slug: e.target.value || null })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">Select a package</option>
              {packages.map((p) => <option key={p.slug} value={p.slug}>{p.name} — ${p.usdPrice}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="wc-preferred-currency">Preferred currency</Label>
            <select id="wc-preferred-currency" value={s.preferred_currency} onChange={(e) => setS({ ...s, preferred_currency: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              {SUPPORTED_CRYPTO.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
          <label className="flex items-end gap-2 text-sm">
            <input type="checkbox" checked={s.confirm_required} onChange={(e) => setS({ ...s, confirm_required: e.target.checked })} />
            Require my confirmation before each auto top-up
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save}>Save auto top-up</Button>
          {saved && <Alert variant="success">Saved.</Alert>}
        </div>
        <p className="text-xs text-muted-foreground">
          Auto top-up creates a crypto payment request when your balance drops below the threshold. With confirmation required, you approve each charge.
        </p>
      </Card>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const map = {
    completed: "success",
    pending: "warning",
    confirming: "info",
    failed: "danger",
    refunded: "default",
  } as const;
  return <Badge variant={map[status as keyof typeof map] ?? "default"}>{status}</Badge>;
}
