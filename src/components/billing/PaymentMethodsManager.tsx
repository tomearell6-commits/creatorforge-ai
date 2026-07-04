"use client";

import { useCallback, useEffect, useState } from "react";
import { Bitcoin, CreditCard, Star, Trash2 } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Input, Label } from "@/components/ui/Input";
import { HighRiskAction2FAModal } from "@/components/security/HighRiskAction2FAModal";

type Method = { id: string; provider: "crypto" | "paddle"; label: string; is_default: boolean };
type Pending = { run: (token?: string) => Promise<void> } | null;

/**
 * Payment method preferences. No card or wallet data is ever stored — Paddle
 * hosts card details; crypto entries are a labelled preference. Changes are a
 * high-risk action: accounts with 2FA confirm with a fresh code.
 */
export function PaymentMethodsManager() {
  const [methods, setMethods] = useState<Method[] | null>(null);
  const [paddleAvailable, setPaddleAvailable] = useState(false);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const load = useCallback(() => {
    fetch("/api/billing/payment-methods")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setMethods(d?.methods ?? []);
        setPaddleAvailable(!!d?.paddleAvailable);
      })
      .catch(() => setMethods([]));
  }, []);

  useEffect(load, [load]);

  /** Run a mutation; on 2FA_REQUIRED, open the modal and retry with the token. */
  async function secured(run: (token?: string) => Promise<Response>) {
    setError(null);
    const res = await run();
    const d = await res.json().catch(() => ({}));
    if (res.status === 403 && d.code === "2FA_REQUIRED") {
      setPending({
        run: async (token?: string) => {
          const retry = await run(token);
          const rd = await retry.json().catch(() => ({}));
          if (!retry.ok) setError(rd.error ?? "Action failed.");
          load();
        },
      });
      return;
    }
    if (!res.ok) setError(d.error ?? "Action failed.");
    load();
  }

  function addCrypto() {
    if (!label.trim()) return;
    secured((token) =>
      fetch("/api/billing/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "x-2fa-token": token } : {}) },
        body: JSON.stringify({ provider: "crypto", label: label.trim(), makeDefault: methods?.length === 0 }),
      })
    ).then(() => {
      setAdding(false);
      setLabel("");
    });
  }

  const makeDefault = (id: string) =>
    secured((token) =>
      fetch("/api/billing/payment-methods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { "x-2fa-token": token } : {}) },
        body: JSON.stringify({ id }),
      })
    );

  const remove = (id: string) =>
    secured((token) =>
      fetch("/api/billing/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(token ? { "x-2fa-token": token } : {}) },
        body: JSON.stringify({ id }),
      })
    );

  if (!methods) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Your payment methods</CardTitle>
        <CardDescription className="mt-1">
          We never store card numbers or wallet keys — these are preferences used at checkout.
        </CardDescription>

        {methods.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No saved payment methods yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {methods.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  {m.provider === "crypto" ? <Bitcoin className="h-5 w-5 text-brand-600" /> : <CreditCard className="h-5 w-5 text-brand-600" />}
                  <div>
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs capitalize text-muted-foreground">{m.provider}</p>
                  </div>
                  {m.is_default && <Badge variant="brand">Default</Badge>}
                </div>
                <div className="flex gap-1">
                  {!m.is_default && (
                    <Button variant="ghost" size="sm" onClick={() => makeDefault(m.id)} aria-label={`Make ${m.label} default`}>
                      <Star className="h-4 w-4" /> Default
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(m.id)} aria-label={`Remove ${m.label}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {adding ? (
          <form
            className="mt-4 space-y-3 rounded-xl border border-border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              addCrypto();
            }}
          >
            <div>
              <Label htmlFor="pm-label">Label</Label>
              <Input id="pm-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Bitcoin (BTC) or USDT — TRC20" maxLength={60} required />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Save method</Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" className="mt-4" onClick={() => setAdding(true)}>
            <Bitcoin className="h-4 w-4" /> Add crypto preference
          </Button>
        )}
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-brand-600" />
          <CardTitle>Card payments via Paddle</CardTitle>
        </div>
        <CardDescription className="mt-2">
          {paddleAvailable
            ? "Card payments are configured. Card details are entered and stored by Paddle at checkout — never on CreatorsForge servers."
            : "Card payments arrive as soon as Paddle merchant verification completes. Until then, crypto checkout covers plans and top-ups."}
        </CardDescription>
      </Card>

      <HighRiskAction2FAModal
        open={pending !== null}
        actionLabel="changing payment methods"
        onCancel={() => setPending(null)}
        onVerified={(token) => {
          const p = pending;
          setPending(null);
          p?.run(token);
        }}
      />
    </div>
  );
}
