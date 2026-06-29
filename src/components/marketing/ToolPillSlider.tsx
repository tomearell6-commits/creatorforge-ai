import { TOOL_PILLS } from "@/lib/marketing";

/** Horizontal scrolling tool/model pills under the hero. */
export function ToolPillSlider() {
  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TOOL_PILLS.map((t) => (
          <span
            key={t}
            className="whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-ink-soft shadow-sm dark:text-muted-foreground"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
