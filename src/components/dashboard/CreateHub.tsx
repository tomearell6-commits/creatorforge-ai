"use client";

import { useState } from "react";
import Link from "next/link";
import { Video, Megaphone, Image as ImageIcon, Search, Share2, Music, Workflow, Coins, ArrowRight, LayoutGrid } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { CATEGORY_GROUPS, CONTENT_CATEGORIES, categoriesByGroup, type ContentCategory } from "@/config/contentCategories";

const ICONS: Record<string, typeof Video> = { Video, Megaphone, Image: ImageIcon, Search, Share2, Music, Workflow };

export function CreateHub({ initialGroup }: { initialGroup?: string }) {
  const [group, setGroup] = useState(initialGroup && CATEGORY_GROUPS.some((g) => g.id === initialGroup) ? initialGroup : CATEGORY_GROUPS[0].id);
  const [q, setQ] = useState("");

  const query = q.trim().toLowerCase();
  const list: ContentCategory[] = query
    ? CONTENT_CATEGORIES.filter((c) => c.name.toLowerCase().includes(query) || c.groupName.toLowerCase().includes(query))
    : categoriesByGroup(group);

  return (
    <div className="space-y-5">
      <div className="relative">
        <LayoutGrid className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all tools and templates…" className="pl-9" />
      </div>

      {!query && (
        <div className="flex flex-wrap gap-2">
          {CATEGORY_GROUPS.map((g) => {
            const Icon = ICONS[g.icon] ?? Video;
            return (
              <button
                key={g.id}
                onClick={() => setGroup(g.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  group === g.id ? "border-brand-600 bg-brand-600 text-white" : "border-border hover:border-brand-300"
                )}
              >
                <Icon className="h-4 w-4" /> {g.name}
              </button>
            );
          })}
        </div>
      )}

      {query && <p className="text-sm text-muted-foreground">{list.length} result{list.length === 1 ? "" : "s"} for “{q}”</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => {
          const Icon = ICONS[c.icon] ?? Video;
          return (
            <Card key={c.categoryId} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.groupName.replace("AI ", "")}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{c.output}</span>
                <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3" /> ~{c.creditEstimate}</span>
              </div>
              <div className="mt-auto flex gap-2">
                <Link href={`/dashboard/create/${c.slug}`} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-300 px-3 py-1.5 text-sm font-semibold text-brand-900 hover:bg-brand-400">
                  Create <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link href={`/dashboard/templates?group=${c.group}`} className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
                  Templates
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
