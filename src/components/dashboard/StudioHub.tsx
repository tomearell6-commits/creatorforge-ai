import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Studio } from "@/config/studios";
import { studioToolCount } from "@/config/studios";

/** Shared landing page for a Studio: header + credits, quick actions, grouped tools. */
export function StudioHub({ studio, creditsRemaining, planName }: { studio: Studio; creditsRemaining: number | null; planName?: string }) {
  const Icon = studio.icon;
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${studio.accent}`}>
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{studio.title}</h1>
            <p className="mt-1 max-w-xl text-muted-foreground">{studio.purpose}</p>
            <p className="mt-1 text-xs text-muted-foreground">{studioToolCount(studio)} tools</p>
          </div>
        </div>
        {creditsRemaining !== null && (
          <Card className="flex items-center gap-3 px-4 py-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{planName ? `${planName} plan` : "Credits"}</p>
              <p className="text-lg font-bold leading-none">{creditsRemaining.toLocaleString()}<span className="ml-1 text-xs font-normal text-muted-foreground">left</span></p>
            </div>
            <Button asChild variant="accent" size="sm"><Link href="/dashboard/credits"><Plus className="h-4 w-4" /> Top Up</Link></Button>
          </Card>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {studio.quickActions.map((qa) => {
          const QIcon = qa.icon;
          return (
            <Button key={qa.href + qa.label} asChild variant={qa === studio.quickActions[0] ? "accent" : "outline"}>
              <Link href={qa.href}><QIcon className="h-4 w-4" /> {qa.label}</Link>
            </Button>
          );
        })}
      </div>

      {/* Tool sections */}
      {studio.sections.map((section) => (
        <div key={section.heading} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{section.heading}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.tools.map((tool) => {
              const TIcon = tool.icon;
              return (
                <Link key={tool.href + tool.label} href={tool.href} data-tour={tool.tour} className="group">
                  <Card className="flex h-full items-center gap-3 transition-colors hover:border-brand-400 hover:bg-muted/40">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${studio.accent}`}>
                      <TIcon className="h-5 w-5" />
                    </div>
                    <span className="flex-1 text-sm font-medium">{tool.label}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
