import Link from "next/link";
import type { BillingWarning } from "@/lib/billing/overview";

const STYLES: Record<BillingWarning["severity"], string> = {
  info: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  critical: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
};

/** Low-credit and expiry banners with action buttons. */
export function BillingWarnings({ warnings }: { warnings: BillingWarning[] }) {
  if (!warnings.length) return null;
  return (
    <div className="space-y-3">
      {warnings.map((w) => (
        <div key={w.title} className={`rounded-xl border px-4 py-3 text-sm ${STYLES[w.severity]}`}>
          <p className="font-semibold">{w.title}</p>
          <p className="mt-0.5 opacity-90">{w.body}</p>
          <div className="mt-2 flex gap-2">
            {w.actions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="rounded-lg border border-current px-3 py-1 text-xs font-semibold hover:opacity-80"
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
