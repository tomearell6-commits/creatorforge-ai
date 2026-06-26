"use client";

import { useState } from "react";
import { Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Starts a NOWPayments crypto checkout for a plan and redirects to the invoice. */
export function CryptoButton({ planId, label }: { planId: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/crypto/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start crypto checkout.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start crypto checkout.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 w-full">
      <Button variant="outline" className="w-full" onClick={pay} disabled={loading}>
        <Bitcoin className="h-4 w-4" /> {loading ? "Starting…" : label ?? "Pay with crypto"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
