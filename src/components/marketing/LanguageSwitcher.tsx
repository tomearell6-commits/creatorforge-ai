"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { LOCALES, type Locale } from "@/lib/i18n";

const UK = (
  <svg viewBox="0 0 60 30" width="20" height="12" aria-hidden xmlns="http://www.w3.org/2000/svg">
    <clipPath id="uk2"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
    <clipPath id="uk2t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
    <g clipPath="url(#uk2)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk2t)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </g>
  </svg>
);

/** Language selector — sets the `lang` cookie and reloads so the server renders
 *  the chosen locale. English is the default. */
export function LanguageSwitcher({ current }: { current: Locale }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = LOCALES.find((l) => l.code === current) ?? LOCALES[0];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(code: string) {
    document.cookie = `lang=${code}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    window.location.reload();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Language: ${active.label}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-muted dark:text-foreground"
      >
        {current === "en"
          ? <span className="overflow-hidden rounded-[3px] leading-none ring-1 ring-black/10">{UK}</span>
          : <Globe className="h-4 w-4 text-muted-foreground" />}
        {active.code.toUpperCase()}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          {LOCALES.map((l) => (
            <button key={l.code} onClick={() => choose(l.code)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-muted">
              {l.label}
              {l.code === current && <Check className="h-4 w-4 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
