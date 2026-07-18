import Link from "next/link";
import { Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/constants";
import { PlanComparison } from "@/components/marketing/PlanComparison";

export const metadata = { title: "Pricing — CreatorsForge AI" };

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight">Simple, credit-based pricing</h1>
            <p className="mt-4 text-muted-foreground">
              Start free. Upgrade when you&apos;re ready. Pay with card (Paddle) or crypto.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  "flex flex-col",
                  plan.highlighted && "border-brand-600 ring-2 ring-brand-600"
                )}
              >
                {plan.highlighted && (
                  <span className="mb-3 w-fit rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  {plan.custom ? (
                    <span className="text-4xl font-extrabold">Custom</span>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold">${plan.price}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.custom ? "Volume credits & SLAs — let's talk" : `${plan.credits.toLocaleString()} credits / month`}
                </p>

                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.highlighted ? "primary" : "outline"}
                  className="mt-6 w-full"
                >
                  {plan.custom ? (
                    <a href="mailto:hello@creatorsforge.io?subject=Enterprise%20plan%20inquiry">Contact sales</a>
                  ) : (
                    <Link href={plan.price === 0 ? "/signup" : `/signup?plan=${plan.id}&redirect=%2Fdashboard%2Fbilling`}>{plan.price === 0 ? "Start free" : "Choose plan"}</Link>
                  )}
                </Button>
              </Card>
            ))}
          </div>

          <PlanComparison />
        </section>
      </main>
      <Footer />
    </div>
  );
}
