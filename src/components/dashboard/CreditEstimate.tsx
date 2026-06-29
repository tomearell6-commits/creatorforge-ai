import Link from "next/link";
import { Coins, AlertTriangle } from "lucide-react";
import { estimateForAction } from "@/lib/credits/estimator";

/**
 * "Estimated X credits" badge shown before an AI action. Pass either an
 * `actionId` (resolved from ACTION_CREDIT_ESTIMATES) or an explicit `credits`.
 * If `remaining` is provided and is too low, shows a "Top Up Now" prompt instead
 * of failing silently.
 */
export function CreditEstimate({
  actionId, credits, remaining, className,
}: { actionId?: string; credits?: number; remaining?: number; className?: string }) {
  const est = actionId ? estimateForAction(actionId) : null;
  const required = credits ?? est?.credits ?? 0;
  const label = est?.label;
  const short = remaining != null && remaining < required;

  if (short) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 ${className ?? ""}`}>
        <AlertTriangle className="h-4 w-4" />
        Not enough credits ({required.toLocaleString()} needed)
        <Link href="/dashboard/credits" className="font-semibold underline">Top Up Now</Link>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-800 ${className ?? ""}`}
      title={est?.note}>
      <Coins className="h-3.5 w-3.5" />
      {label ? `${label}: ` : "Estimated "}~{required.toLocaleString()} credits
    </span>
  );
}
