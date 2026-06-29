"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { WORKFLOW_TABS } from "@/lib/marketing";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function WorkflowTabs() {
  const [active, setActive] = useState(WORKFLOW_TABS[0].id);
  const panel = WORKFLOW_TABS.find((t) => t.id === active) ?? WORKFLOW_TABS[0];

  return (
    <div>
      <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-1 rounded-full bg-brand-600 p-1">
        {WORKFLOW_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active === t.id ? "bg-background text-ink shadow dark:text-foreground" : "text-white/90 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid items-center gap-6 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
        <div>
          <h3 className="text-2xl font-bold text-ink dark:text-foreground">{panel.title}</h3>
          <ul className="mt-4 space-y-2">
            {panel.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-ink-soft dark:text-muted-foreground">
                <Check className="h-4 w-4 text-brand-600" /> {b}
              </li>
            ))}
          </ul>
          <Button asChild variant="accent" className="mt-6"><Link href="/signup">Try it Now →</Link></Button>
        </div>
        <div className="flex h-56 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 text-6xl">
          🎥
        </div>
      </div>
    </div>
  );
}
