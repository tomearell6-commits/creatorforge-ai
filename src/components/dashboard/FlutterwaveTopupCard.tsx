"use client";

import { useState } from "react";
import { CreditCard, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { MIN_PURCHASE_USD, MAX_PURCHASE_USD, CREDITS_PER_USD } from "@/lib/constants";

/**
 * Card + Mobile Money top-up via Flutterwave. Fully additive — sits alongside
 * the crypto wallet, never replaces it. Creates a Flutterwave checkout and
 * redirects to the hosted payment page. Credits are granted by the webhook.
 */
export function FlutterwaveTopupCard() {
  const [usd, setUsd] = useState(10);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const credits = Math.floor(usd * CREDITS_PER_USD);

  async function pay() {
    if (usd < MIN_PURCHASE_USD || usd > MAX_PURCHASE_USD) {
      setMsg({ kind: "error", text: `Enter an amount between $${MIN_PURCHASE_USD} and $${MAX_PURCHASE_USD}.` });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/flutterwave/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "topup", usd }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ kind: "error", text: j.error || "Could not start checkout." }); return; }
      if (j.link) { window.location.href = j.link; return; }
      setMsg({ kind: "success", text: j.note || "Checkout ready (preview mode — add Flutterwave keys to accept live payments)." });
    } finally { setBusy(false); }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-brand-600" />
        <Smartphone className="h-5 w-5 text-brand-600" />
        <h2 className="text-lg font-semibold">Pay with Card or Mobile Money</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Top up with Visa/Mastercard or Mobile Money (MTN MoMo, Orange Money) via Flutterwave. Credits never expire.
      </p>
      {msg && <div className="mt-3"><Alert variant={msg.kind}>{msg.text}</Alert></div>}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="flw-usd">Amount (USD)</Label>
          <Input id="flw-usd" type="number" min={MIN_PURCHASE_USD} max={MAX_PURCHASE_USD} value={usd}
            onChange={(e) => setUsd(Number(e.target.value))} className="w-40" />
        </div>
        <p className="pb-2 text-sm text-muted-foreground">≈ <span className="font-semibold text-foreground">{credits.toLocaleString()}</span> credits</p>
        <Button onClick={pay} disabled={busy}>{busy ? "Starting…" : "Pay with Flutterwave"}</Button>
      </div>
    </Card>
  );
}
