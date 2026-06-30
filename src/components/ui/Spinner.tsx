import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-8 w-8" } as const;

/** Canonical loading spinner. Carries an accessible label for screen readers. */
export function Spinner({ size = "md", className, label = "Loading" }: { size?: keyof typeof sizes; className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center">
      <Loader2 className={cn("animate-spin text-brand-600", sizes[size], className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Full-area centered loading state (cards, panels, route loading.tsx). */
export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground", className)}>
      <Spinner size="lg" label={label} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
