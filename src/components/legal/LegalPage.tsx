import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shared shell for legal documents (Terms, Privacy, Refund policy).
 * Server component — plain, readable typography, print-friendly.
 */
export function LegalPage({
  title, effectiveDate, children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><Sparkles className="h-5 w-5" /></span>
            <span>CreatorsForge<span className="text-brand-600">.io</span></span>
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/refund-policy" className="hover:text-foreground">Refunds</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Effective date: {effectiveDate}</p>
        <article className="legal-body mt-8 space-y-6 text-sm leading-relaxed text-foreground/90 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2">
          {children}
        </article>
        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          Questions about this document? Contact us at <a href="mailto:hello@creatorsforge.io" className="text-brand-600 hover:underline">hello@creatorsforge.io</a>.
        </footer>
      </main>
    </div>
  );
}
