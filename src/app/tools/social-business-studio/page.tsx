import Link from "next/link";
import type { Metadata } from "next";
import { Check, ArrowRight, Share2 } from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/home/MarketingFooter";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Social Business Studio — Multi-Platform Social Management",
  description:
    "Connect your social accounts, generate platform-specific content, images, and videos, schedule and publish, organize enquiries, draft replies, and track performance — one workspace across every supported platform. Official APIs only.",
};

const FEATURES = [
  "Connect Facebook, Instagram, LinkedIn, TikTok, YouTube, Pinterest, X & more",
  "Provider capability registry (know what each platform's API supports)",
  "One idea → platform-specific content variations (never identical copy)",
  "AI images (Design Studio) + AI videos (Video Studio)",
  "Multi-platform campaign builder",
  "Publishing calendar + queue with per-platform tracking",
  "Inbox & enquiries with AI reply drafting (safety guardrails)",
  "Cross-platform analytics + reports",
  "Automation rules (manual / assisted / autopilot)",
];
const PLATFORMS = ["Facebook", "Instagram", "LinkedIn", "TikTok", "YouTube", "Pinterest", "X", "Threads", "Google Business", "WordPress", "Brevo"];
const FAQ = [
  { q: "Do you need my social passwords?", a: "Never. We use each platform's official OAuth sign-in. Tokens are encrypted and never exposed to the browser." },
  { q: "Does it post to every platform automatically?", a: "Live posting per platform requires that platform's approved developer app (Meta, LinkedIn, TikTok, YouTube, etc.). Until approved, we prepare and export content and never claim a post succeeded unless the provider confirms it." },
  { q: "Do you write the same text everywhere?", a: "No — one campaign idea produces platform-specific headlines, captions, hashtags, formats, and image/video prompts adapted to each platform." },
  { q: "How are credits used?", a: "Only AI actions cost credits (content, variations, images, videos, campaigns, replies, reports). Connecting, viewing, and manual editing are free, with the estimate shown first." },
];

export default function SocialBusinessStudioLanding() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-background" />
          <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground"><Share2 className="h-4 w-4 text-brand-600" /> Social Business Studio</span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-5xl">All your social platforms, one workspace</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">Connect your accounts, create platform-specific content, schedule and publish, organize enquiries, and track performance — powered by AI, using official platform APIs.</p>
            <div className="mt-8"><Button asChild variant="accent" size="lg"><Link href="/signup">Get started <ArrowRight className="h-4 w-4" /></Link></Button></div>
            <div className="mt-8 flex flex-wrap justify-center gap-2">{PLATFORMS.map((p) => <span key={p} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">{p}</span>)}</div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">Everything to run social from one place</h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => <div key={f} className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {f}</div>)}
          </div>
        </section>

        <section className="border-t border-border py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-3xl font-bold">FAQ</h2>
            <div className="mt-8 space-y-3">
              {FAQ.map((f) => <div key={f.q} className="rounded-xl border border-border bg-card p-4"><p className="font-semibold">{f.q}</p><p className="mt-1 text-sm text-muted-foreground">{f.a}</p></div>)}
            </div>
            <div className="mt-10 text-center"><Button asChild size="lg" variant="accent"><Link href="/signup">Start creating <ArrowRight className="h-4 w-4" /></Link></Button></div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
