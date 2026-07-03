import Link from "next/link";
import { Sparkles } from "lucide-react";
import { STUDIOS } from "@/config/studios";

const su = (href: string) => `/signup?redirect=${encodeURIComponent(href)}`;

const RESOURCES = [
  { label: "Help Center", href: "#faq" },
  { label: "API Docs", href: su("/dashboard/api") },
  { label: "Affiliate", href: su("/dashboard/affiliate") },
  { label: "Blog", href: "#faq" },
  { label: "Contact", href: "#faq" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Refund Policy", href: "/refund-policy" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-ink dark:text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white"><Sparkles className="h-5 w-5" /></span>
              <span>CreatorsForge<span className="text-brand-600">.io</span></span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">The AI Business Operating System — create, market, publish, automate, analyze, and grow.</p>
          </div>

          {/* Studio columns (grouped by Studio per spec) */}
          {STUDIOS.map((studio) => (
            <div key={studio.id}>
              <p className="text-sm font-semibold text-foreground">{studio.title}</p>
              <ul className="mt-3 space-y-2">
                {studio.sections[0].tools.slice(0, 5).map((t) => (
                  <li key={t.label}><Link href={su(t.href)} className="text-sm text-muted-foreground hover:text-brand-600">{t.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-8 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="text-sm font-semibold text-foreground">Resources</p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {RESOURCES.map((r) => (
                <li key={r.label}><Link href={r.href} className="text-sm text-muted-foreground hover:text-brand-600">{r.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {2026} CreatorsForge.io. All rights reserved.</p>
          <p>Build · Market · Publish · Automate · Grow</p>
        </div>
      </div>
    </footer>
  );
}
