import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getArea, HOME_QUICK_ACTIONS, type NavAreaId } from "@/config/dashboardNavigation";
import { Card, CardDescription } from "@/components/ui/Card";

/** Area hub (Create / Grow / Manage): quick actions + section cards. */
export function AreaHub({ areaId }: { areaId: NavAreaId }) {
  const area = getArea(areaId);
  const actions = HOME_QUICK_ACTIONS[areaId];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{area.headline}</h1>
        <p className="mt-1 text-muted-foreground">{area.description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(({ label, route, icon: Icon }) => (
          <Link
            key={label}
            href={route}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand-500/60 hover:bg-muted/40"
          >
            <span className="rounded-lg bg-brand-900 p-2 text-brand-300 dark:bg-brand-950/50 dark:text-brand-300">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {area.sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.id} className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-brand-900 p-2 text-brand-300 dark:bg-brand-950/50 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="font-bold">{section.label}</h2>
              </div>
              <CardDescription className="mt-2">{section.description}</CardDescription>
              <ul className="mt-3 flex-1 space-y-1">
                {section.children.filter((ch) => ch.isEnabled !== false).slice(0, 5).map((child) => (
                  <li key={child.id}>
                    <Link href={child.route} className="text-sm text-muted-foreground hover:text-brand-600 hover:underline">
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={section.route}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
              >
                Open {section.label} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
