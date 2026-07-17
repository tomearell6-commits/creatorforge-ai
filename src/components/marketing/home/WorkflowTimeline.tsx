import { Lightbulb, Sparkles, PenLine, Clapperboard, Globe, Workflow, BarChart3, TrendingUp } from "lucide-react";
import { Reveal } from "./Reveal";

const STAGES = [
  { icon: Lightbulb, label: "Idea" },
  { icon: Sparkles, label: "AI Generation" },
  { icon: PenLine, label: "Editing" },
  { icon: Clapperboard, label: "Rendering" },
  { icon: Globe, label: "Publishing" },
  { icon: Workflow, label: "Automation" },
  { icon: BarChart3, label: "Analytics" },
  { icon: TrendingUp, label: "Growth" },
];

export function WorkflowTimeline() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {STAGES.map((s, i) => {
        const Icon = s.icon;
        return (
          <Reveal key={s.label} delay={i * 90}>
            <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
              <span className="absolute right-3 top-3 text-xs font-bold text-brand-300">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-900 text-brand-300 dark:bg-brand-950/50 dark:text-brand-300">
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-foreground">{s.label}</span>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
