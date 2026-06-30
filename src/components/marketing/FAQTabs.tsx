"use client";

import { useState } from "react";
import { FAQ_TABS } from "@/lib/marketing";
import { cn } from "@/lib/utils";

export function FAQTabs() {
  const [active, setActive] = useState(FAQ_TABS[0].id);
  const tab = FAQ_TABS.find((t) => t.id === active) ?? FAQ_TABS[0];

  return (
    <div>
      {/* Underline tab bar */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-b border-border">
        {FAQ_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "relative -mb-px pb-3 text-sm font-semibold transition-colors",
              active === t.id
                ? "text-ink dark:text-foreground"
                : "text-muted-foreground hover:text-ink dark:hover:text-foreground"
            )}
          >
            {t.label}
            {active === t.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ink dark:bg-brand-500" />
            )}
          </button>
        ))}
      </div>

      {/* Two-column answer cards */}
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {tab.items.map((item) => (
          <div
            key={item.q}
            className="rounded-2xl bg-muted/50 p-6 transition-colors hover:bg-muted dark:bg-card dark:hover:bg-muted/40"
          >
            <h3 className="text-lg font-bold text-ink dark:text-foreground">{item.q}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
