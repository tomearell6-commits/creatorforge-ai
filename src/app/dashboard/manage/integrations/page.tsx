import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getArea } from "@/config/dashboardNavigation";
import { Card, CardDescription } from "@/components/ui/Card";

export const metadata = { title: "Integrations — CreatorsForge AI" };

/** Manage → Integrations: every connectable platform in one place. */
export default function IntegrationsPage() {
  const section = getArea("manage").sections.find((s) => s.id === "integrations")!;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="mt-1 text-muted-foreground">
          Connect the platforms CreatorsForge publishes to and works with.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {section.children.filter((c) => c.isEnabled !== false).map((child) => {
          const Icon = child.icon;
          return (
            <Card key={child.id} className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-brand-100 p-2 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="font-bold">{child.label}</h2>
              </div>
              <CardDescription className="mt-2 flex-1">{child.description}</CardDescription>
              <Link
                href={child.route}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
              >
                Open <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
