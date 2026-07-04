import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DASHBOARD_NAV, HOME_QUICK_ACTIONS } from "@/config/dashboardNavigation";

/**
 * Dashboard home: the three areas — Create Something / Grow Your Business /
 * Manage Your Account — each with its quick-action cards and section links.
 */
export function HomeAreaSections() {
  return (
    <div className="space-y-8">
      {DASHBOARD_NAV.map((area) => (
        <section key={area.id} className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-semibold">{area.headline}</h2>
              <p className="text-sm text-muted-foreground">{area.description}</p>
            </div>
            <Link
              href={`/dashboard/${area.id}`}
              className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-brand-600 hover:underline"
            >
              Open {area.label} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HOME_QUICK_ACTIONS[area.id].map(({ label, route, icon: Icon }) => (
              <Link
                key={label}
                href={route}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand-500/60 hover:bg-muted/40"
              >
                <span className="rounded-lg bg-brand-100 p-2 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">{label}</span>
              </Link>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {area.sections.map((s, i) => (
              <span key={s.id}>
                {i > 0 && " · "}
                <Link href={s.route} className="hover:text-brand-600 hover:underline">
                  {s.label}
                </Link>
              </span>
            ))}
          </p>
        </section>
      ))}
    </div>
  );
}
