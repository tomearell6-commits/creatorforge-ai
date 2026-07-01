import Link from "next/link";
import type { Metadata } from "next";
import { Check, ArrowRight, Search } from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { FloatingPromptBar } from "@/components/marketing/FloatingPromptBar";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "AI SEO Content Studio for Blogs and WordPress",
  description:
    "Generate complete SEO blog packages, optimize your articles, and schedule posts directly to WordPress — all from CreatorsForge.io.",
};

const PACKAGE = [
  "SEO title + meta title & description", "URL slug + focus keyword", "Full article (H1/H2/H3 + body)",
  "FAQ section + schema recommendation", "Featured image + image prompts + alt text", "Excerpt, tags & WordPress category",
  "Social captions + newsletter summary", "Internal + external link suggestions", "SEO + readability score (placeholder)",
];
const WORKFLOW = [
  "Connect your WordPress site (Application Password, encrypted).",
  "Generate a full SEO article package from one keyword.",
  "Edit the title, meta, headings, and body.",
  "Choose draft, publish now, or schedule.",
  "CreatorsForge posts it to WordPress via the REST API.",
  "Track status + history in your blog calendar.",
];
const FAQ = [
  { q: "Does it publish straight to WordPress?", a: "Yes — connect your site with a WordPress Application Password and CreatorsForge posts via the official REST API (draft, publish, or schedule)." },
  { q: "Are my credentials safe?", a: "We never store raw passwords. Application Passwords are encrypted at rest and are revocable from WordPress at any time." },
  { q: "Can I schedule a content calendar?", a: "Yes — schedule articles ahead and view them on the blog calendar (daily / weekly / monthly)." },
  { q: "How are credits used?", a: "Credits cover article generation, image prompts, and publishing. You'll see the estimate before you generate." },
];

export default function SeoContentStudioPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-background" />
          <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Search className="h-4 w-4 text-brand-600" /> SEO Content Studio
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink dark:text-foreground sm:text-5xl">
              AI SEO Content Studio for Blogs and WordPress
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Generate complete SEO blog packages, optimize your articles, and schedule posts directly to WordPress.
            </p>
            <div className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-sm">
              <Search className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="flex-1 truncate text-left text-sm text-muted-foreground">e.g. best dog food for puppies…</span>
              <Button asChild variant="accent" size="sm"><Link href="/signup">Generate <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          </div>
        </section>

        {/* SEO package features */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">One keyword → a complete SEO package</h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PACKAGE.map((f) => (
              <div key={f} className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {f}
              </div>
            ))}
          </div>
        </section>

        {/* WordPress workflow */}
        <section className="border-t border-border bg-muted/40 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-3xl font-bold">Publish to WordPress in one flow</h2>
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

        {/* Calendar preview + credits note */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold">Plan a blog content calendar</h2>
              <p className="mt-3 text-muted-foreground">
                Schedule articles across your WordPress sites and see drafts, scheduled, and published posts on a
                daily, weekly, or monthly calendar — just like a publishing team.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Credits cover generation + publishing, with the estimate shown before you generate.
              </p>
              <Button asChild className="mt-6"><Link href="/signup">Start free <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-md bg-muted/60 p-1 text-[10px] text-muted-foreground">
                    {i % 5 === 0 && <span className="block rounded bg-brand-200 px-1 text-brand-800">📝</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-3xl font-bold">FAQ</h2>
            <div className="mt-8 space-y-3">
              {FAQ.map((f) => (
                <div key={f.q} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-semibold">{f.q}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button asChild size="lg" variant="accent"><Link href="/signup">Start creating SEO content <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <FloatingPromptBar />
    </div>
  );
}
