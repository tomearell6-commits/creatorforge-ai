import { CalendarDays, ListChecks, Workflow, BarChart3, CheckCircle2, Bell } from "lucide-react";
import { Reveal } from "./Reveal";

const ITEMS = [
  { icon: CalendarDays, title: "Content Calendar", desc: "Plan weeks of content visually." },
  { icon: ListChecks, title: "Publishing Queue", desc: "Everything lined up and ready to ship." },
  { icon: Workflow, title: "Automation Rules", desc: "Trigger actions on your schedule." },
  { icon: BarChart3, title: "Weekly Reports", desc: "Performance summarized automatically." },
  { icon: CheckCircle2, title: "Approval Workflow", desc: "Review before anything goes live." },
  { icon: Bell, title: "Notifications", desc: "Stay informed at every step." },
];

export function AutopilotShowcase() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <Reveal>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">CreatorsForge Autopilot</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-4xl">
            Configure once. CreatorsForge works every day.
          </h2>
          <p className="mt-4 max-w-md text-ink-soft dark:text-muted-foreground">
            Set your strategy, approve your plan, and let Autopilot generate, schedule, and publish your content on a recurring basis — with you in control.
          </p>
        </div>
      </Reveal>

      <div className="relative space-y-3">
        {/* vertical connector */}
        <div aria-hidden className="absolute left-[22px] top-4 bottom-4 w-px bg-gradient-to-b from-brand-300 to-transparent" />
        {ITEMS.map((it, i) => {
          const Icon = it.icon;
          return (
            <Reveal key={it.title} delay={i * 90}>
              <div className="relative flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-900 dark:bg-brand-950/50 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{it.title}</p>
                  <p className="text-sm text-muted-foreground">{it.desc}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
