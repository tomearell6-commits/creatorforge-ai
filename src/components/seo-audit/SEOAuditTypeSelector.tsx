"use client";

import { Check, Coins } from "lucide-react";
import { SEO_AUDIT_TYPES } from "@/lib/constants";

/** What each type unlocks, beyond its base description. */
const EXTRA: Record<string, string> = {
  full: "Checks up to 25 pages: missing About / FAQ / Contact / Privacy / Terms, footer, duplicates. Then shows priced fixes.",
  wordpress: "Whole-site check plus WordPress-specific tips.",
  ecommerce: "Whole-site check plus shop pages, returns policy and product pages.",
  blog: "Whole-site check plus blog and article structure.",
};

/** Choice list for the audit type; every option shows its name and credit cost in plain, high-contrast text. */
export function SEOAuditTypeSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Audit type" className="grid gap-3 sm:grid-cols-2">
      {SEO_AUDIT_TYPES.map((t) => {
        const selected = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(t.id)}
            className={`flex items-start gap-3 rounded-xl border-2 bg-card p-4 text-left text-foreground transition-colors ${selected ? "border-brand-500 ring-2 ring-brand-500/30" : "border-border hover:border-brand-400"}`}
          >
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-brand-500 bg-brand-500 text-ink" : "border-muted-foreground"}`}>
              {selected && <Check className="h-3 w-3" strokeWidth={4} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold">
                  {t.name}
                  {t.id === "full" && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">Recommended</span>}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground"><Coins className="h-3 w-3" />{t.credits} credits</span>
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{t.description}</span>
              {EXTRA[t.id] && <span className="mt-1 block text-xs text-muted-foreground">{EXTRA[t.id]}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
