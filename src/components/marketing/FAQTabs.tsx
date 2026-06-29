"use client";

import { useState } from "react";
import { FAQ_TABS } from "@/lib/marketing";
import { cn } from "@/lib/utils";

export function FAQTabs() {
  const [active, setActive] = useState(FAQ_TABS[0].id);
  const tab = FAQ_TABS.find((t) => t.id === active) ?? FAQ_TABS[0];

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {FAQ_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              active === t.id ? "bg-brand-600 text-white" : "border border-border text-ink-soft hover:bg-muted dark:text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mx-auto mt-6 max-w-3xl space-y-3">
        {tab.items.map((item) => (
          <details key={item.q} className="group rounded-2xl border border-border bg-card p-4">
            <summary className="cursor-pointer list-none font-medium text-ink marker:hidden dark:text-foreground">
              {item.q}
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
