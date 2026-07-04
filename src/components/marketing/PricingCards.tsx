"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Homepage pricing — renders the REAL billing catalog (lib/constants PLANS),
 * so the price a visitor sees here is exactly what checkout charges.
 * Annual = 2 months free (annualPrice = 10× monthly).
 */
export function PricingCards() {
  const [yearly, setYearly] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-3 text-sm">
        <span className={cn(!yearly && "font-semibold text-ink dark:text-foreground")}>Monthly</span>
        <button
          onClick={() => setYearly((v) => !v)}
          className="relative h-6 w-11 rounded-full bg-brand-600 transition-colors"
          aria-label="Toggle yearly billing"
        >
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", yearly ? "left-[22px]" : "left-0.5")} />
        </button>
        <span className={cn(yearly && "font-semibold text-ink dark:text-foreground")}>
          Yearly <span className="rounded-full bg-brand-200 px-2 py-0.5 text-xs font-semibold text-brand-900">2 months free</span>
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        {PLANS.map((p) => {
          const hasAnnual = p.annualPrice != null;
          const displayPrice = yearly && hasAnnual ? Math.round((p.annualPrice! / 12) * 100) / 100 : p.price;
          return (
            <div
              key={p.id}
              className={cn(
                "flex flex-col rounded-3xl border bg-card p-6 shadow-sm",
                p.highlighted ? "border-brand-400 ring-2 ring-brand-300" : "border-border"
              )}
            >
              {p.badge && (
                <span className="mb-2 w-fit rounded-full bg-brand-300 px-3 py-0.5 text-xs font-bold text-brand-900">{p.badge}</span>
              )}
              <h3 className="text-lg font-bold text-ink dark:text-foreground">{p.name}</h3>
              <p className="text-xs text-muted-foreground">{p.tagline}</p>
              <div className="mt-4 flex items-end gap-1">
                {p.custom ? (
                  <span className="text-3xl font-extrabold text-ink dark:text-foreground">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-extrabold text-ink dark:text-foreground">${displayPrice}</span>
                    <span className="mb-1 text-sm text-muted-foreground">
                      /mo{yearly && hasAnnual ? `, billed $${p.annualPrice}/yr` : ""}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-brand-700">
                {p.custom ? "Custom credits / mo" : `${p.credits.toLocaleString()} credits${p.id === "free" ? " to try" : " / mo"}`}
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-soft dark:text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant={p.highlighted ? "accent" : "outline"} className="mt-6">
                {p.custom ? (
                  <Link href="/signup?redirect=%2Fdashboard%2Fbilling%2Fsupport">Contact Sales</Link>
                ) : p.price === 0 ? (
                  <Link href="/signup">Start free</Link>
                ) : (
                  <Link href={`/signup?plan=${p.id}&redirect=%2Fdashboard%2Fbilling%2Fplans`}>Select Plan</Link>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
