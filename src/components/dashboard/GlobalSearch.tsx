"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { buildNavSearchIndex, type NavAreaId } from "@/config/dashboardNavigation";
import { CONTENT_CATEGORIES } from "@/config/contentCategories";
import { CONTENT_TEMPLATES } from "@/config/contentTemplates";
import { cn } from "@/lib/utils";

type Result = {
  label: string;
  route: string;
  area: NavAreaId;
  kind: "tool" | "category" | "template";
  hint: string;
};

const AREA_LABEL: Record<NavAreaId, string> = { create: "Create", grow: "Grow", manage: "Manage" };
const AREA_STYLE: Record<NavAreaId, string> = {
  create: "bg-brand-100 text-brand-800 dark:bg-brand-950/50 dark:text-brand-300",
  grow: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  manage: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
};

/** Build the full search corpus once: nav tree + categories + templates. */
function buildIndex(): Result[] {
  const out: Result[] = buildNavSearchIndex().map((e) => ({
    label: e.label,
    route: e.route,
    area: e.area,
    kind: "tool" as const,
    hint: e.section,
  }));
  for (const cat of CONTENT_CATEGORIES) {
    out.push({ label: cat.name, route: cat.route, area: "create", kind: "category", hint: cat.groupName });
  }
  for (const t of CONTENT_TEMPLATES) {
    out.push({ label: t.name, route: t.route, area: "create", kind: "template", hint: "Template" });
  }
  return out;
}

/** Global search: click or press Ctrl/Cmd+K, type, jump anywhere. */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const index = useMemo(buildIndex, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const scored = index
      .map((r) => {
        const label = r.label.toLowerCase();
        const hint = r.hint.toLowerCase();
        let score = 0;
        if (label === q) score = 100;
        else if (label.startsWith(q)) score = 80;
        else if (label.includes(q)) score = 60;
        else if (hint.includes(q)) score = 30;
        return { r, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.r);
    // Dedupe by route+label (nav items and categories can overlap).
    const seen = new Set<string>();
    return scored.filter((r) => {
      const k = `${r.label}|${r.route}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [index, query]);

  function go(r: Result) {
    setOpen(false);
    router.push(r.route);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the dashboard (Ctrl+K)"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">Search…</span>
        <kbd className="hidden rounded border border-border px-1 text-[10px] lg:inline">Ctrl K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-24" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
            className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelected((s) => Math.min(s + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelected((s) => Math.max(s - 1, 0));
                  } else if (e.key === "Enter" && results[selected]) {
                    go(results[selected]);
                  }
                }}
                placeholder="Search studios, tools, templates, billing, settings…"
                aria-label="Search"
                className="h-12 flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {query && results.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches for “{query}”.</p>
              )}
              {!query && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Type to search across Create, Grow and Manage.
                </p>
              )}
              {results.map((r, i) => (
                <button
                  key={`${r.label}-${r.route}`}
                  type="button"
                  onClick={() => go(r)}
                  onMouseEnter={() => setSelected(i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm",
                    i === selected ? "bg-muted" : ""
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.hint}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", AREA_STYLE[r.area])}>
                      {AREA_LABEL[r.area]}
                    </span>
                    {i === selected && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
