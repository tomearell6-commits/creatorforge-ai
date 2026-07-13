import Link from "next/link";
import type { Metadata } from "next";
import { Check, ArrowRight, MapPin } from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/home/MarketingFooter";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Google Business Profile Manager — Local Business Studio",
  description:
    "Manage, audit, and optimize your Google Business Profile, generate professional local posts and branded images, prepare review replies, and plan local content — all in CreatorsForge.io. An AI optimization workspace, not a ranking guarantee.",
};

const FEATURES = [
  "Profile Health audit (0–100) across 5 categories",
  "AI Profile Optimizer for descriptions & sections",
  "16 professional post types + AI branded images",
  "Content calendar + publishing queue",
  "Review Reply Assistant with safety guardrails",
  "Products & services manager",
  "Local SEO content planner",
  "Business insights + performance reports",
  "Multi-location support",
];
const WORKFLOW = [
  "Connect your Google account (official sign-in — never a password) or add a location manually.",
  "Run a Profile Health audit and get a prioritized 7-day + 30-day plan.",
  "Optimize your description and sections with AI.",
  "Generate professional posts and branded images.",
  "Schedule or publish, and draft review replies.",
  "Track your activity and available insights.",
];
const FAQ = [
  { q: "Does this guarantee higher Google rankings?", a: "No. It's an AI optimization, publishing, and management workspace. We help keep your profile complete and active and give you a Profile Health score — we never promise Google Search or Maps rankings." },
  { q: "Do you need my Google password?", a: "Never. We use official Google sign-in. Live reads/writes require Google's approved Business Profile API access; until then you can add locations manually and use every AI feature." },
  { q: "Are review replies auto-published?", a: "No. Replies are drafted for your approval. Negative and sensitive reviews are always flagged for a human before anything is posted." },
  { q: "How are credits used?", a: "Only AI actions cost credits (audits, posts, images, plans, reports) — connecting, viewing, and manual editing are free. The estimate is shown before every paid action." },
];

export default function LocalBusinessStudioLanding() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-background" />
          <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-brand-600" /> Local Business Studio
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-5xl">Google Business Profile Manager</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Keep your profile complete, create professional local posts and branded visuals, prepare review replies, and understand what&rsquo;s missing — powered by AI. An optimization workspace, not a ranking guarantee.
            </p>
            <div className="mt-8"><Button asChild variant="accent" size="lg"><Link href="/signup">Get started <ArrowRight className="h-4 w-4" /></Link></Button></div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">Everything to manage your local presence</h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {f}</div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-muted/40 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-3xl font-bold">How it works</h2>
            <ol className="mt-8 space-y-3">
              {WORKFLOW.map((step, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-300 text-sm font-bold text-brand-900">{i + 1}</span>
                  <span className="text-sm">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-3xl font-bold">FAQ</h2>
            <div className="mt-8 space-y-3">
              {FAQ.map((f) => (
                <div key={f.q} className="rounded-xl border border-border bg-card p-4"><p className="font-semibold">{f.q}</p><p className="mt-1 text-sm text-muted-foreground">{f.a}</p></div>
              ))}
            </div>
            <div className="mt-10 text-center"><Button asChild size="lg" variant="accent"><Link href="/signup">Manage your profile <ArrowRight className="h-4 w-4" /></Link></Button></div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
