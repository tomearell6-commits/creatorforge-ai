"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, Sparkles } from "lucide-react";

const LINKS = [
  { label: "Studios", href: "#studios" },
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#features" },
  { label: "Affiliate", href: "/signup?redirect=%2Fdashboard%2Faffiliate" },
  { label: "Blog", href: "#faq" },
];

export function MarketingNav({ isAuthed }: { isAuthed: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-colors ${scrolled ? "border-b border-border bg-background/85 backdrop-blur" : "bg-transparent"}`}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4" aria-label="Primary">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-ink dark:text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white"><Sparkles className="h-5 w-5" /></span>
          <span>CreatorsForge<span className="text-brand-600">.io</span></span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthed ? (
            <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:text-brand-600">Dashboard</Link>
          ) : (
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:text-brand-600">Login</Link>
          )}
          <Link href="/tutorials" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">Watch Demo</Link>
          <Link href="/signup" className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-400">Start Free</Link>
        </div>

        <button className="md:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="cf-fade border-t border-border bg-background px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <Link href={isAuthed ? "/dashboard" : "/login"} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted">{isAuthed ? "Dashboard" : "Login"}</Link>
              <Link href="/tutorials" onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-center text-sm font-semibold hover:bg-muted">Watch Demo</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="rounded-lg bg-brand-300 px-4 py-2 text-center text-sm font-bold text-brand-900 hover:bg-brand-400">Start Free</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
