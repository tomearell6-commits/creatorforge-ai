"use client";

import { useCallback, useEffect, useState } from "react";
import type { WalletSummary } from "@/lib/credits/wallet";

/** Fetches the authoritative wallet summary and exposes a refresh(). */
export function useWallet() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const refresh = useCallback(async () => {
    const r = await fetch("/api/wallet");
    if (r.ok) setSummary(await r.json());
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { summary, refresh };
}

export type Quote = { ok: boolean; error?: string; usd: number; credits: number; fee: number; total: number };

/** Debounced server-side quote for the custom-amount purchase form. */
export function useCallbackQuote(mode: "usd" | "credits", val: string): Quote | null {
  const [quote, setQuote] = useState<Quote | null>(null);
  useEffect(() => {
    const n = Number(val);
    if (!val || !Number.isFinite(n) || n <= 0) { setQuote(null); return; }
    const id = setTimeout(async () => {
      const body = mode === "usd" ? { usd: n } : { credits: n };
      const r = await fetch("/api/wallet/quote", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) setQuote({ ok: false, error: d.error, usd: 0, credits: 0, fee: 0, total: 0 });
      else setQuote({ ok: true, ...d });
    }, 350);
    return () => clearTimeout(id);
  }, [mode, val]);
  return quote;
}
