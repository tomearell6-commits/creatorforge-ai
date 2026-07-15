import Link from "next/link";
import { ArrowLeft, ArrowRight, LayoutList } from "lucide-react";

/**
 * Step-by-step navigator for the Lead → Outreach journey. Rendered at the bottom
 * of each step page so users always know which step they're on (N of 6) and can
 * move to the previous/next step or back to the journey overview.
 */
const ORDER = [
  { id: "setup", label: "Set up", route: "/dashboard/leads/settings" },
  { id: "find", label: "Find leads", route: "/dashboard/leads/search" },
  { id: "verify", label: "Verify emails", route: "/dashboard/leads/verification" },
  { id: "list", label: "Build a list", route: "/dashboard/leads/lists" },
  { id: "write", label: "Write outreach", route: "/dashboard/leads/templates" },
  { id: "send", label: "Send campaign", route: "/dashboard/leads/campaigns" },
] as const;

export type LeadStepId = (typeof ORDER)[number]["id"];

export function LeadStepNav({ current }: { current: LeadStepId }) {
  const idx = ORDER.findIndex((s) => s.id === current);
  const prev = idx > 0 ? ORDER[idx - 1] : null;
  const next = idx >= 0 && idx < ORDER.length - 1 ? ORDER[idx + 1] : null;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/dashboard/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <LayoutList className="h-4 w-4" /> Journey overview
        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">Step {idx + 1} of {ORDER.length}</span>
      </Link>
      <div className="flex items-center gap-2">
        {prev && (
          <Link href={prev.route} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
            <ArrowLeft className="h-4 w-4" /> {prev.label}
          </Link>
        )}
        {next && (
          <Link href={next.route} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
            Next: {next.label} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
