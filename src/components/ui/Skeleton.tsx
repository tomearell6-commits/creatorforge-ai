import { cn } from "@/lib/utils";

/** Skeleton placeholder block. Use while data loads to avoid layout shift. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/** Convenience: a skeleton card matching the standard Card padding/shape. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <Skeleton className="h-5 w-1/2" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}
