"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Play, Sparkles } from "lucide-react";

const EXAMPLES = [
  "Create a YouTube Short about electric cars.",
  "Write an SEO article about pet care.",
  "Create a Facebook advertising campaign.",
  "Write a children's book.",
  "Run an SEO audit.",
];

export function Hero() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [value, setValue] = useState("");

  // Typewriter rotation through the example prompts (pauses if the user types).
  useEffect(() => {
    if (value) return; // user is typing — stop the demo
    const full = EXAMPLES[idx];
    let i = 0;
    setText("");
    const typer = setInterval(() => {
      i++;
      setText(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(typer);
        setTimeout(() => setIdx((p) => (p + 1) % EXAMPLES.length), 1800);
      }
    }, 38);
    return () => clearInterval(typer);
  }, [idx, value]);

  function submit() {
    const prompt = (value || EXAMPLES[idx]).trim();
    router.push(`/signup?prompt=${encodeURIComponent(prompt)}`);
  }

  return (
    <section className="relative overflow-hidden">
      {/* Drifting brand gradient blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-background to-background dark:from-brand-950/30" />
        <div className="cf-drift absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-200/50 blur-3xl dark:bg-brand-800/20" />
        <div className="cf-drift-slow absolute -right-24 top-10 h-96 w-96 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-700/20" />
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-12 pt-20 text-center sm:pt-28">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-900 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
          <Sparkles className="h-4 w-4" /> The AI Business Operating System
        </span>
        <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-ink dark:text-foreground sm:text-6xl">
          Build, Market, Publish, Automate and Grow Your Business with AI
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-ink-soft dark:text-muted-foreground">
          CreatorsForge.io combines AI content creation, SEO, publishing, automation, analytics, and business tools into one professional platform.
        </p>

        {/* Live AI prompt input with rotating examples */}
        <div className="mx-auto mt-8 max-w-2xl">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-brand-400">
            <Sparkles className="ml-2 h-5 w-5 shrink-0 text-brand-500" />
            <input
              aria-label="Describe what you want to create"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={text || EXAMPLES[idx]}
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground sm:text-base"
            />
            <button onClick={submit} aria-label="Start creating" className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700">
              Create <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="cf-glow inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-brand-700 sm:w-auto">
            Start Creating Free <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/#demo" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-7 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto">
            <Play className="h-5 w-5" /> Watch Demo Video
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">No credit card required · 50 free trial credits</p>
      </div>
    </section>
  );
}
