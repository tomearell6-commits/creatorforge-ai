import Link from "next/link";
import { Coins } from "lucide-react";

/** Lime credit pill + plan chip for the dashboard top bar. */
export function CreditBadge({ credits, plan }: { credits: number; plan: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-full border border-border px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground sm:inline">
        {plan} plan
      </span>
      <Link
        href="/dashboard/credits"
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-300 px-3 py-1 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-400"
        title="Top up credits"
      >
        <Coins className="h-4 w-4" />
        {credits.toLocaleString()} credits
      </Link>
    </div>
  );
}
