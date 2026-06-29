"use client";

import { Coins } from "lucide-react";
import { SEO_AUDIT_TYPES } from "@/lib/constants";

/** Card grid for choosing the audit type; shows each type's credit cost. */
export function SEOAuditTypeSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {SEO_AUDIT_TYPES.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} type="button"
          className={`rounded-xl border p-4 text-left transition-colors ${value === t.id ? "border-brand-500 bg-brand-50 ring-1 ring-brand-300" : "border-border hover:bg-muted"}`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{t.name}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground"><Coins className="h-3 w-3" />{t.credits}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
        </button>
      ))}
    </div>
  );
}
