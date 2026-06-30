import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";

export function FinalCTA() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-ink p-10 text-center sm:p-16">
      <div aria-hidden className="cf-drift pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
      <div aria-hidden className="cf-drift-slow pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
      <h2 className="relative text-3xl font-extrabold leading-tight text-white sm:text-5xl">
        One Platform.<br />Infinite Possibilities.
      </h2>
      <p className="relative mx-auto mt-4 max-w-xl text-white/70">
        Everything you need to create, market, publish, automate and grow your business using AI.
      </p>
      <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/signup" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-300 px-7 py-3.5 text-base font-bold text-brand-900 transition-colors hover:bg-brand-400 sm:w-auto">
          Start Free <ArrowRight className="h-5 w-5" />
        </Link>
        <Link href="#demo" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto">
          <CalendarClock className="h-5 w-5" /> Book Live Demo
        </Link>
      </div>
    </div>
  );
}
