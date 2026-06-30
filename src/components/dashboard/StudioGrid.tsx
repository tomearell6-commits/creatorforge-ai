import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { STUDIOS, studioToolCount } from "@/config/studios";

/** The six flagship Studios as large interactive cards — the heart of the Master Dashboard. */
export function StudioGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {STUDIOS.map((studio) => {
        const Icon = studio.icon;
        return (
          <Card key={studio.id} className="flex flex-col gap-4 transition-colors hover:border-brand-400">
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${studio.accent}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <Link href={`/dashboard/studio/${studio.id}`} className="font-semibold hover:text-brand-600">{studio.title}</Link>
                <p className="mt-0.5 text-sm text-muted-foreground">{studio.tagline}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {studio.quickActions.slice(0, 3).map((qa) => (
                <Link key={qa.href + qa.label} href={qa.href} className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  {qa.label}
                </Link>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>{studioToolCount(studio)} tools</span>
              <Link href={`/dashboard/studio/${studio.id}`} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
                Enter Studio <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
