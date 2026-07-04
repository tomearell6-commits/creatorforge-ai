"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";

type Rec = { rec_key: string; title: string; body: string; cta_label: string; cta_href: string; severity: string };

/** Upgrade recommendations generated from the account's real usage. */
export function RecommendationsPanel() {
  const [recs, setRecs] = useState<Rec[] | null>(null);

  useEffect(() => {
    fetch("/api/billing/recommendations")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRecs(d?.recommendations ?? []))
      .catch(() => setRecs([]));
  }, []);

  async function dismiss(recKey: string) {
    setRecs((prev) => (prev ?? []).filter((r) => r.rec_key !== recKey));
    await fetch("/api/billing/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recKey }),
    }).catch(() => {});
  }

  if (!recs?.length) return null;

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand-600" />
        <CardTitle>Recommendations for you</CardTitle>
      </div>
      <div className="mt-3 space-y-3">
        {recs.map((r) => (
          <div key={r.rec_key} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-semibold">{r.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{r.body}</p>
              <Link href={r.cta_href} className="mt-1 inline-block text-sm font-semibold text-brand-600 hover:underline">
                {r.cta_label} →
              </Link>
            </div>
            <button
              type="button"
              aria-label={`Dismiss recommendation: ${r.title}`}
              onClick={() => dismiss(r.rec_key)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
