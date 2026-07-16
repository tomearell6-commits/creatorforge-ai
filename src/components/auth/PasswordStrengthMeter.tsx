"use client";

import { Check, X } from "lucide-react";
import { passwordChecks, passwordScore, STRENGTH_LABELS } from "@/lib/security/password";

const BAR = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-brand-600", "bg-brand-600"];

/** Password strength bar + rule checklist. Purely presentational. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = passwordScore(password);
  const checks = passwordChecks(password);
  const pct = password ? ((score + 1) / 5) * 100 : 0;

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${BAR[score]}`} style={{ width: `${pct}%` }} />
      </div>
      {password && <p className="text-xs text-muted-foreground">Strength: <span className="font-medium text-foreground">{STRENGTH_LABELS[score]}</span></p>}
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? "text-brand-700 dark:text-brand-300" : "text-muted-foreground"}`}>
            {c.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
