import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getArea } from "@/config/dashboardNavigation";
import { Card, CardDescription } from "@/components/ui/Card";
import { ConnectedAccountsCenter } from "@/components/integrations/ConnectedAccountsCenter";

export const metadata = { title: "Connected Accounts — CreatorsForge AI" };

/** Manage → Integrations: the unified Connected Accounts Center + detailed managers. */
export default function IntegrationsPage() {
  const section = getArea("manage").sections.find((s) => s.id === "integrations")!;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Connected Accounts</h1>
        <p className="mt-1 text-muted-foreground">
          One place to connect everywhere CreatorsForge publishes and promotes — social, advertising, websites, and email.
          Connect once here, then publish from any finished project. We use official sign-in and never store your passwords.
        </p>
      </div>

      <ConnectedAccountsCenter />

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground">Detailed managers</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {section.children.filter((c) => c.isEnabled !== false).map((child) => {
            const Icon = child.icon;
            return (
              <Card key={child.id} className="flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-brand-900 p-2 text-brand-300 dark:bg-brand-950/50 dark:text-brand-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-bold">{child.label}</h3>
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
    </div>
  );
}
