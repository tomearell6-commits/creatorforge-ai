import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PricingCards } from "@/components/marketing/PricingCards";
import { MarketingNav } from "@/components/marketing/home/MarketingNav";
import { Hero } from "@/components/marketing/home/Hero";
import { AIDemoFlow } from "@/components/marketing/home/AIDemoFlow";
import { StudioShowcase } from "@/components/marketing/home/StudioShowcase";
import { TemplateMarketplace } from "@/components/marketing/home/TemplateMarketplace";
import { WorkflowTimeline } from "@/components/marketing/home/WorkflowTimeline";
import { FeatureShowcase } from "@/components/marketing/home/FeatureShowcase";
import { AutopilotShowcase } from "@/components/marketing/home/AutopilotShowcase";
import { AssistantDemo } from "@/components/marketing/home/AssistantDemo";
import { EcosystemSection } from "@/components/marketing/home/EcosystemSection";
import { TestimonialsComingSoon } from "@/components/marketing/home/TestimonialsComingSoon";
import { HomeFaq } from "@/components/marketing/home/HomeFaq";
import { FinalCTA } from "@/components/marketing/home/FinalCTA";
import { MarketingFooter } from "@/components/marketing/home/MarketingFooter";
import { Reveal } from "@/components/marketing/home/Reveal";

const TITLE = "CreatorsForge.io — The AI Business Operating System";
const DESCRIPTION =
  "Build, market, publish, automate and grow your business with AI. CreatorsForge.io combines AI content creation, SEO, publishing, automation, analytics, and business tools into one professional platform.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.creatorsforge.io", siteName: "CreatorsForge.io", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "CreatorsForge.io",
      url: "https://www.creatorsforge.io",
      description: DESCRIPTION,
    },
    {
      "@type": "SoftwareApplication",
      name: "CreatorsForge.io",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://www.creatorsforge.io",
      description: DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free trial with starter credits" },
    },
  ],
};

/** Reusable section header. */
function SectionHead({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <Reveal className="mx-auto mb-10 max-w-2xl text-center">
      {eyebrow && <p className="text-sm font-bold uppercase tracking-wide text-brand-700">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-4xl">{title}</h2>
      {subtitle && <p className="mx-auto mt-3 text-ink-soft dark:text-muted-foreground">{subtitle}</p>}
    </Reveal>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <MarketingNav isAuthed={!!user} />

      <main className="flex-1">
        <Hero />

        {/* Demo video + interactive AI demonstration */}
        <section id="demo" className="border-y border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHead eyebrow="See it in action" title="One prompt. A complete workflow." subtitle="Watch how CreatorsForge turns a single idea into finished content, published and measured — automatically." />
            <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border shadow-lg">
              <video
                controls
                preload="metadata"
                playsInline
                className="aspect-video w-full bg-black"
                src="https://fbdfwisbjtpaifvsetfg.supabase.co/storage/v1/object/public/media/tutorials/homepage-demo.mp4#t=0.1"
              />
            </div>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Want more? <a href="/tutorials" className="font-semibold text-brand-600 hover:underline">Browse all video tutorials →</a>
            </p>
            <div className="mt-12">
              <AIDemoFlow />
            </div>
          </div>
        </section>

        {/* Six flagship Studios */}
        <section id="studios" className="mx-auto max-w-6xl px-4 py-20">
          <SectionHead eyebrow="Six flagship Studios" title="Professional workspaces for every job" subtitle="Each Studio brings together the tools for one part of your business — all under one roof." />
          <StudioShowcase />
        </section>

        {/* Template marketplace */}
        <section id="templates" className="border-y border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHead eyebrow="AI Template Marketplace" title="Start from a proven template" subtitle="Filter by Studio, platform, and difficulty — then make it yours in seconds." />
            <TemplateMarketplace />
          </div>
        </section>

        {/* Professional workflow */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <SectionHead eyebrow="How it works" title="From idea to growth" subtitle="Every project flows through the same professional pipeline." />
          <WorkflowTimeline />
        </section>

        {/* Feature showcase */}
        <section id="features" className="border-y border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHead eyebrow="Everything included" title="A premium tool for every need" subtitle="Twelve flagship capabilities, one unified platform." />
            <FeatureShowcase />
          </div>
        </section>

        {/* Autopilot */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <AutopilotShowcase />
        </section>

        {/* Assistant */}
        <section className="border-y border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4"><AssistantDemo /></div>
        </section>

        {/* AI Business OS ecosystem */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <SectionHead eyebrow="One unified ecosystem" title="The AI Business Operating System" subtitle="The six Studios are designed to work together — output from one becomes fuel for the next." />
          <EcosystemSection />
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-y border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHead eyebrow="Pricing" title="Plans that scale with you" subtitle="Start free. Upgrade when you're ready. Top up credits any time." />
            <PricingCards />
          </div>
        </section>

        {/* Testimonials */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <SectionHead eyebrow="For creators & businesses" title="Built for the way you work" subtitle="One platform for content, design, sites and growth — with customer stories on the way." />
          <TestimonialsComingSoon />
        </section>

        {/* FAQ */}
        <section id="faq" className="border-y border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHead eyebrow="FAQ" title="Questions, answered" subtitle="Search the most common questions about CreatorsForge." />
            <HomeFaq />
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-5xl px-4 py-20">
          <FinalCTA />
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
