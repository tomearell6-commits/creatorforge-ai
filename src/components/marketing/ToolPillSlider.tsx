import Link from "next/link";
import { TOOL_PILLS } from "@/lib/marketing";
import { slugify } from "@/config/contentCategories";

/** Horizontal scrolling tool/model pills under the hero. Each links to its
 *  dashboard category in the unified Create hub. */
export function ToolPillSlider() {
  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TOOL_PILLS.map((t) => (
          <Link
            key={t}
            href={`/dashboard/create/${slugify(t)}`}
            className="whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-ink-soft shadow-sm transition-colors hover:border-brand-300 hover:text-ink dark:text-muted-foreground"
          >
            {t}
          </Link>
        ))}
      </div>
    </div>
  );
}
