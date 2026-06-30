import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

/**
 * Canonical empty state. Always guides the user to the next action.
 * Pass either `href` (renders a link button) or `onAction` (renders a button).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  href,
  onAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  href?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {actionLabel && href && (
        <Button asChild size="sm"><Link href={href}>{actionLabel}</Link></Button>
      )}
      {actionLabel && !href && onAction && (
        <Button size="sm" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
