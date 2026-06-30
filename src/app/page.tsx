import Link from "next/link";
import { Star } from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { HeroPromptBox } from "@/components/marketing/HeroPromptBox";
import { ToolPillSlider } from "@/components/marketing/ToolPillSlider";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { WorkflowTabs } from "@/components/marketing/WorkflowTabs";
import { TemplateGallery } from "@/components/marketing/TemplateGallery";
import { PricingCards } from "@/components/marketing/PricingCards";
import { FAQTabs } from "@/components/marketing/FAQTabs";
import { Testimonials } from "@/components/marketing/Testimonials";
import { DemoVideo } from "@/components/marketing/DemoVideo";
import { FloatingPromptBar } from "@/components/marketing/FloatingPromptBar";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { FEATURE_CARDS } from "@/lib/marketing";
import { getDictionary } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "CreatorForge.io",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  url: "https://www.creatorsforge.io",
  description:
    "AI-powered content studio for faceless videos, product ads, AI shorts, music videos, image-to-video, and social content.",
  offers: { "@type": "Offer", price: "19", priceCurrency: "USD" },
};

export default async function LandingPage() {
  const t = getDictionary(await getServerLocale());
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-background" />
          <div className="mx-auto max-w-4xl px-4 pb-10 pt-16 text-center">
            <div className="mb-4 flex items-center justify-center gap-1 text-brand-600">
              {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-ink dark:text-foreground sm:text-6xl">
              {t.hero.title1}<br /><span className="italic">{t.hero.title2}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-soft dark:text-muted-foreground">
              {t.hero.subtitle}
            </p>
            <div className="mx-auto mt-8 max-w-2xl">
              <HeroPromptBox />
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-4 pb-12">
            <ToolPillSlider />
          </div>
        </section>

        {/* Featured tool cards */}
        <section id="tools" className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_CARDS.map((c) => <FeatureCard key={c.title} {...c} />)}
          </div>
        </section>

        {/* Workflow */}
        <section className="border-y border-border bg-brand-50/60 py-20 dark:bg-brand-900/10">
          <div className="mx-auto max-w-6xl px-4">
            <p className="text-center text-sm font-bold uppercase tracking-wide text-brand-700">Your workflow</p>
            <h2 className="mt-2 text-center text-4xl font-extrabold tracking-tight text-ink dark:text-foreground">
              From Solo Creators to Growing Brands
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-ink-soft dark:text-muted-foreground">
              CreatorForge helps creators and businesses produce content faster, test more ideas, and publish consistently.
            </p>
            <div className="mt-10"><WorkflowTabs /></div>
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center text-4xl font-extrabold tracking-tight text-ink dark:text-foreground">Templates for every format</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-ink-soft dark:text-muted-foreground">
            Start from a proven format and recreate it with your own idea in one click.
          </p>
          <div className="mt-10"><TemplateGallery /></div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-y border-border bg-brand-50/60 py-20 dark:bg-brand-900/10">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-4xl font-extrabold tracking-tight text-ink dark:text-foreground">Pick Your Plan</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-ink-soft dark:text-muted-foreground">
              Scale your content creation with higher limits, premium AI models, and faster rendering.
            </p>
            <div className="mt-10"><PricingCards /></div>
          </div>
        </section>

        {/* Demo video */}
        <DemoVideo />

        {/* Testimonials */}
        <Testimonials />

        {/* FAQ */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-4xl">Frequently Asked Questions</h2>
            <p className="text-sm text-muted-foreground">
              Can&apos;t find the answer you&apos;re looking for? Reach out to our{" "}
              <Link href="/dashboard/support" className="font-semibold text-brand-600 hover:text-brand-700">customer support</Link> team.
            </p>
          </div>
          <div className="mt-10"><FAQTabs /></div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-4 pb-28 pt-4 text-center">
          <div className="rounded-3xl bg-ink p-12">
            <h2 className="text-3xl font-extrabold text-white">Start creating with CreatorForge today</h2>
            <p className="mt-3 text-white/70">Your first project is free — no credit card required.</p>
            <a href="/signup" className="mt-8 inline-flex rounded-full bg-brand-300 px-6 py-3 font-semibold text-brand-900 hover:bg-brand-400">
              Start Creating Now
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
      <FloatingPromptBar />
    </div>
  );
}
