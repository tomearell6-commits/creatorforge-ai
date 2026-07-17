import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/home/MarketingNav";
import { MarketingFooter } from "@/components/marketing/home/MarketingFooter";
import { DEFAULT_AFFILIATE_RATE } from "@/lib/constants";

const PCT = Math.round(DEFAULT_AFFILIATE_RATE * 100); // 30

const TITLE = `Affiliate Program — Earn ${PCT}% Commission | CreatorsForge.io`;
const DESCRIPTION = `Join the CreatorsForge.io affiliate program and earn ${PCT}% commission for every customer you refer. Free to join, real-time tracking, no cap on earnings.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/affiliate" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.creatorsforge.io/affiliate", siteName: "CreatorsForge.io", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const STEPS = [
  { n: 1, title: "Join free", body: "Create your account and grab your unique referral link from the affiliate dashboard. No cost, no approval wait." },
  { n: 2, title: "Share your link", body: "Promote CreatorsForge to your audience — YouTube, a blog, social, a newsletter, or your community. Your link tracks every click." },
  { n: 3, title: `Earn ${PCT}%`, body: `Get ${PCT}% commission on the payments of every customer who signs up through your link. Track clicks, referrals, and earnings in real time.` },
];

const FAQ = [
  { q: "How much do I earn?", a: `You earn ${PCT}% commission on payments from customers you refer. There's no cap — the more you refer, the more you earn.` },
  { q: "How much does it cost to join?", a: "Nothing. The affiliate program is completely free to join — you just need a CreatorsForge account." },
  { q: "How do I track my referrals?", a: "Your affiliate dashboard shows clicks, sign-ups, conversions, and commissions in real time, with your unique link and marketing assets." },
  { q: "Who is this for?", a: "Creators, marketers, agencies, bloggers, and anyone with an audience interested in AI content and business tools. If your audience creates content or runs a business, CreatorsForge is an easy recommendation." },
];

export default function AffiliatePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingNav isAuthed={false} />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Affiliate Program</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-5xl">
            Earn {PCT}% commission promoting CreatorsForge
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-soft dark:text-muted-foreground">
            Recommend the AI Business Operating System your audience already needs — and earn {PCT}% on every
            customer you bring in. Free to join, no earnings cap.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup?redirect=%2Fdashboard%2Faffiliate" className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700">
              Become an affiliate
            </Link>
            <Link href="/#studios" className="rounded-xl border border-border px-6 py-3 font-semibold text-foreground transition hover:bg-muted">
              See what you&rsquo;ll promote
            </Link>
          </div>
        </section>

        {/* Highlight band */}
        <section className="border-y border-border bg-muted/30 py-12">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-4 text-center sm:grid-cols-3">
            <div>
              <p className="text-4xl font-extrabold text-brand-600">{PCT}%</p>
              <p className="mt-1 text-sm text-muted-foreground">Commission per customer</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-brand-600">$0</p>
              <p className="mt-1 text-sm text-muted-foreground">Cost to join</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-brand-600">∞</p>
              <p className="mt-1 text-sm text-muted-foreground">No cap on earnings</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink dark:text-foreground">How it works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-900 font-bold text-brand-300 dark:bg-brand-950/50 dark:text-brand-300">{s.n}</div>
                <h3 className="mt-4 text-lg font-bold text-ink dark:text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-soft dark:text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink dark:text-foreground">Affiliate FAQ</h2>
            <dl className="mt-8 space-y-6">
              {FAQ.map((f) => (
                <div key={f.q} className="rounded-2xl border border-border bg-card p-6">
                  <dt className="font-semibold text-ink dark:text-foreground">{f.q}</dt>
                  <dd className="mt-2 text-ink-soft dark:text-muted-foreground">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink dark:text-foreground">Start earning today</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft dark:text-muted-foreground">
            Join free, grab your link, and earn {PCT}% on every customer you refer.
          </p>
          <Link href="/signup?redirect=%2Fdashboard%2Faffiliate" className="mt-6 inline-block rounded-xl bg-brand-600 px-8 py-3 font-semibold text-white transition hover:bg-brand-700">
            Become an affiliate
          </Link>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
