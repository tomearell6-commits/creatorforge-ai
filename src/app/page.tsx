import Link from "next/link";
import { ArrowRight, Sparkles, Wand2, Layers, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NicheExplorer } from "@/components/marketing/NicheExplorer";
import { CATEGORIES } from "@/lib/constants";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "CreatorForge AI",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  url: "https://www.creatorsforge.io",
  description:
    "AI platform to generate scripts, voiceovers, captions, and faceless videos — then publish them to social platforms and WordPress.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-background dark:from-brand-900/20" />
          <div className="mx-auto max-w-4xl px-4 py-24 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-brand-600" />
              AI content creation, end to end
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
              Forge faceless content with{" "}
              <span className="text-brand-600">AI superpowers</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Scripts, voiceovers, captions, thumbnails, and videos — for horror, motivation,
              anime, business, finance, and more. Go from idea to publish in minutes.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start creating free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center text-3xl font-bold">Everything you need to create</h2>
          <p className="mt-3 text-center text-muted-foreground">
            A modular platform that grows with you — Phase 1 ships the foundation.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Wand2, title: "AI Script Generation", desc: "Turn a one-line idea into a structured, ready-to-record script." },
              { icon: Layers, title: "Project Management", desc: "Organize every piece of content into projects you can revisit." },
              { icon: ShieldCheck, title: "Flexible Billing", desc: "Credit-based usage with Paddle and crypto payment options." },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="border-t border-border bg-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold">Built for every niche</h2>
            <p className="mt-3 text-center text-muted-foreground">
              Pick a niche to preview its sub-topics and exactly what CreatorForge produces for it.
            </p>
            <div className="mt-10">
              <NicheExplorer categories={CATEGORIES} />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-4 py-24 text-center">
          <h2 className="text-3xl font-bold">Ready to forge your next viral video?</h2>
          <p className="mt-3 text-muted-foreground">Create your free account — no credit card required.</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/signup">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
