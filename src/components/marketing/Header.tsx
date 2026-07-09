import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getDictionary } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export async function Header() {
  const locale = await getServerLocale();
  const t = getDictionary(locale);
  // Absolute paths / real pages so every link works from ANY page and lets
  // visitors explore before signing up (no anchor-only or signup-wall links).
  const nav = [
    { label: t.nav.tools, href: "/#studios" },
    { label: t.nav.seo, href: "/tools/seo-content-studio" },
    { label: t.nav.tutorials, href: "/tutorials" },
    { label: t.nav.resources, href: "/blog" },
    { label: t.nav.pricing, href: "/pricing" },
    { label: t.nav.affiliate, href: "/affiliate" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((n) => (
            <Link key={n.label} href={n.href} className="text-sm font-medium text-ink-soft hover:text-ink dark:text-muted-foreground dark:hover:text-foreground">
              {n.label}
            </Link>
          ))}
          <LanguageSwitcher current={locale} />
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm"><Link href="/login">{t.nav.login}</Link></Button>
          <Button asChild variant="accent" size="sm"><Link href="/signup">{t.nav.cta}</Link></Button>
        </div>
      </div>
    </header>
  );
}
