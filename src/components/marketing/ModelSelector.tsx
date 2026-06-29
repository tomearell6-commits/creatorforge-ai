"use client";

import { HERO_MODELS } from "@/lib/marketing";

/** Compact model dropdown used inside the prompt boxes. */
export function ModelSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-ink-soft dark:text-muted-foreground">
      <span className="text-muted-foreground">Model:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xs font-medium text-ink outline-none dark:text-foreground"
      >
        {HERO_MODELS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </label>
  );
}
