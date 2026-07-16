import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";
import { STUDIOS, studioToolCount } from "@/config/studios";
import { Reveal } from "./Reveal";

// Illustrative "recent activity" lines — generic platform capabilities, not fabricated user data.
const ACTIVITY: Record<string, string> = {
  content: "Rendered a 30s Short + 3 thumbnails",
  marketing: "Generated a 5-headline ad pack",
  publishing: "Drafted Chapter 4 (1,820 words)",
  automation: "Queued 7 posts for this week",
  analytics: "Completed an SEO audit · score 82",
  business: "Top-up of 5,000 credits applied",
};

export function StudioShowcase() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {STUDIOS.map((studio, i) => {
        const Icon = studio.icon;
        const popular = studio.sections[0]?.tools.slice(0, 4) ?? [];
        return (
          <Reveal key={studio.id} delay={(i % 3) * 80}>
            <div className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${studio.accent}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{studio.title}</h3>
                  <p className="text-xs text-muted-foreground">{studioToolCount(studio)} tools</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{studio.purpose}</p>

              <div className="flex flex-wrap gap-1.5">
                {popular.map((t) => (
                  <span key={t.label} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{t.label}</span>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100">
                <Activity className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">{ACTIVITY[studio.id]}</span>
              </div>

              <Link href={`/studios/${studio.id}`} className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800">
                Explore Studio <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
