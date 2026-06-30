import { ArrowRight, TrendingUp } from "lucide-react";
import { STUDIOS } from "@/config/studios";
import { Reveal } from "./Reveal";

/** Shows the six Studios flowing into one another — one unified ecosystem. */
export function EcosystemSection() {
  return (
    <div>
      <div className="flex flex-wrap items-stretch justify-center gap-3">
        {STUDIOS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex items-center gap-3">
              <Reveal delay={i * 80}>
                <div className="flex w-32 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold leading-tight text-foreground">{s.title.replace(" Studio", "")}</span>
                </div>
              </Reveal>
              {i < STUDIOS.length - 1 && <ArrowRight className="hidden h-5 w-5 shrink-0 text-brand-400 lg:block" />}
            </div>
          );
        })}
        <ArrowRight className="hidden h-5 w-5 shrink-0 text-brand-400 lg:block" />
        <Reveal delay={STUDIOS.length * 80}>
          <div className="flex w-32 flex-col items-center gap-2 rounded-2xl border border-brand-300 bg-brand-50 p-4 text-center shadow-sm dark:bg-brand-950/40">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold leading-tight text-brand-800 dark:text-brand-300">Business Growth</span>
          </div>
        </Reveal>
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-ink-soft dark:text-muted-foreground">
        Content feeds marketing. Marketing feeds publishing. Automation runs it all. Analytics closes the loop — one unified ecosystem built for growth.
      </p>
    </div>
  );
}
