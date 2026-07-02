"use client";

import Link from "next/link";
import { useState } from "react";
import { Share2, Megaphone, Briefcase, Globe, BookOpen, ShoppingBag, Clapperboard, Palette, Coins, Star } from "lucide-react";
import { DESIGN_GROUPS, getCategoriesForGroup } from "@/config/designStudio";

const GROUP_ICON: Record<string, typeof Share2> = {
  Share2, Megaphone, Briefcase, Globe, BookOpen, ShoppingBag, Clapperboard, Palette,
};

/** Browsable grid of design groups → categories. Each category links to the
 *  wizard preselected. Optionally filter to a single group. */
export function DesignCategoryGrid({ initialGroup }: { initialGroup?: string }) {
  const [active, setActive] = useState<string>(initialGroup ?? DESIGN_GROUPS[0].id);
  const cats = getCategoriesForGroup(active);
  const group = DESIGN_GROUPS.find((g) => g.id === active);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {DESIGN_GROUPS.map((g) => {
          const Icon = GROUP_ICON[g.icon] ?? Palette;
          const on = g.id === active;
          return (
            <button
              key={g.id}
              onClick={() => setActive(g.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              <Icon className="h-4 w-4" /> {g.name}
            </button>
          );
        })}
      </div>

      {group && <p className="text-sm text-muted-foreground">{group.description}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cats.map((c) => (
          <Link
            key={c.slug}
            href={`/dashboard/design/new?category=${c.slug}`}
            className="group relative rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
          >
            {c.featured && <Star className="absolute right-3 top-3 h-3.5 w-3.5 fill-brand-400 text-brand-400" />}
            <div className="text-sm font-semibold leading-tight">{c.name}</div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Coins className="h-3 w-3" /> ~{c.credits} credits
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
