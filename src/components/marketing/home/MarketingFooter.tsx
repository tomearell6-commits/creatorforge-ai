import Link from "next/link";
import { Sparkles } from "lucide-react";
import { STUDIOS } from "@/config/studios";
import { BrandIcon } from "@/components/icons/BrandIcon";

const su = (href: string) => `/signup?redirect=${encodeURIComponent(href)}`;

const RESOURCES = [
  { label: "Help Center", href: "#faq" },
  { label: "API Docs", href: su("/dashboard/api") },
  { label: "Affiliate", href: su("/dashboard/affiliate") },
  { label: "Blog", href: "#faq" },
  { label: "Contact", href: "#faq" },
  { label: "Privacy Policy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "System Status", href: "#" },
];

const SOCIAL: { platform: string; label: string }[] = [
  { platform: "x", label: "X (Twitter)" },
  { platform: "youtube", label: "YouTube" },
  { platform: "instagram", label: "Instagram" },
  { platform: "linkedin", label: "LinkedIn" },
  { platform: "facebook", label: "Facebook" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-ink dark:text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white"><Sparkles className="h-5 w-5" /></span>
              CreatorForge<span className="text-brand-600">.io</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">The AI Business Operating System — create, market, publish, automate, analyze, and grow.</p>
            <div className="mt-4 flex gap-2">
              {SOCIAL.map(({ platform, label }) => (
                <a key={label} href="#" aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <BrandIcon platform={platform} monochrome className="h-4 w-4" />
                </a>
              ))}
            </div>
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
          <p>© {2026} CreatorForge.io. All rights reserved.</p>
          <p>Build · Market · Publish · Automate · Grow</p>
        </div>
      </div>
    </footer>
  );
}
