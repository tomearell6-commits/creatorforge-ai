import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

const NAV = [
  { label: "Tools", href: "#tools" },
  { label: "SEO Studio", href: "/tools/seo-content-studio" },
  { label: "Resources", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
  { label: "Affiliate", href: "/signup" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link key={n.label} href={n.href} className="text-sm font-medium text-ink-soft hover:text-ink dark:text-muted-foreground dark:hover:text-foreground">
              {n.label}
            </Link>
          ))}
          <span className="text-sm text-muted-foreground">🇬🇧 EN</span>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm"><Link href="/login">Log in</Link></Button>
          <Button asChild variant="accent" size="sm"><Link href="/signup">Start Creating Now</Link></Button>
        </div>
      </div>
    </header>
  );
}
