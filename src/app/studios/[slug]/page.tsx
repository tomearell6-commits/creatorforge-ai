import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STUDIOS } from "@/config/studios";
import { MarketingNav } from "@/components/marketing/home/MarketingNav";
import { MarketingFooter } from "@/components/marketing/home/MarketingFooter";

const BASE = "https://www.creatorsforge.io";

/** Polished public-facing intros (the shared config copy is written for the
 *  in-app/owner context; these read better for prospective visitors). */
const PUBLIC_INTRO: Record<string, string> = {
  content: "Produce videos, voiceovers, images, graphics, and written content end to end — all powered by AI, all in one workspace.",
  marketing: "Plan and launch ad campaigns across every platform, write high-converting copy, and track what's working — without a marketing team.",
  publishing: "Write, design, and export full-length books and long-form publications, from AI-generated outline to finished cover.",
  automation: "Put your content on Autopilot: plan, schedule, and publish on a recurring basis so growth keeps happening while you sleep.",
  analytics: "Audit any website, track your SEO and campaigns, and watch the metrics that actually move your business.",
  business: "Run the business side of your brand — planning products, managing your team, billing, and integrations — all in one place.",
};

export function generateStaticParams() {
  return STUDIOS.map((s) => ({ slug: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const studio = STUDIOS.find((s) => s.id === slug);
  if (!studio) return { title: "Studio not found — CreatorsForge.io" };
  const title = `${studio.title} — ${studio.tagline} | CreatorsForge.io`;
  const description = PUBLIC_INTRO[studio.id] || studio.purpose;
  return {
    title,
    description,
    alternates: { canonical: `/studios/${studio.id}` },
    openGraph: { title, description, url: `${BASE}/studios/${studio.id}`, siteName: "CreatorsForge.io", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StudioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const studio = STUDIOS.find((s) => s.id === slug);
  if (!studio) notFound();

  // Flatten capabilities (deduped by label) for a "what's inside" grid.
  const seen = new Set<string>();
  const capabilities = studio.sections
    .flatMap((sec) => sec.tools)
    .filter((t) => (seen.has(t.label) ? false : (seen.add(t.label), true)))
    .slice(0, 12);

  const others = STUDIOS.filter((s) => s.id !== studio.id);
  const Icon = studio.icon;
  const intro = PUBLIC_INTRO[studio.id] || studio.purpose;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav isAuthed={false} />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${studio.accent}`}>
            <Icon className="h-7 w-7" />
          </div>
          <p className="mt-4 text-sm font-bold uppercase tracking-wide text-brand-700">CreatorsForge Studio</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-5xl">{studio.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-soft dark:text-muted-foreground">{intro}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700">Start free</Link>
            <Link href="/pricing" className="rounded-xl border border-border px-6 py-3 font-semibold text-foreground transition hover:bg-muted">See pricing</Link>
          </div>
        </section>

        {/* Capabilities */}
        <section className="border-y border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink dark:text-foreground">What&rsquo;s inside {studio.title}</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((c) => {
                const CIcon = c.icon;
                return (
                  <div key={c.label} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${studio.accent}`}><CIcon className="h-5 w-5" /></div>
                    <span className="pt-1.5 text-sm font-medium text-foreground">{c.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Explore other studios */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink dark:text-foreground">Explore the other Studios</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((s) => {
              const SIcon = s.icon;
              return (
                <Link key={s.id} href={`/studios/${s.id}`} className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-5 transition hover:shadow-md">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.accent}`}><SIcon className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-brand-700">{s.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.tagline}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-4 pb-20 text-center">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-8 dark:border-brand-900/40 dark:bg-brand-950/20">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink dark:text-foreground">Ready to try {studio.title}?</h2>
            <p className="mx-auto mt-2 max-w-lg text-ink-soft dark:text-muted-foreground">Start free and explore everything CreatorsForge can do — no credit card required.</p>
            <Link href="/signup" className="mt-6 inline-block rounded-xl bg-brand-600 px-8 py-3 font-semibold text-white transition hover:bg-brand-700">Start free</Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
