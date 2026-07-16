import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Variant = "default" | "brand" | "success" | "warning" | "danger" | "info" | "outline";

const variants: Record<Variant, string> = {
  default: "bg-muted text-muted-foreground",
  brand: "bg-brand-100 text-brand-900 dark:bg-brand-950/50 dark:text-brand-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  outline: "border border-border text-muted-foreground",
};

/**
 * Status badge — the one canonical pill for statuses, plans, counts, and tags.
 * Replaces the many ad-hoc `rounded-full px-2 py-0.5 text-xs` spans across the app.
 */
export function Badge({
  variant = "default",
  className,
  dot = false,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {props.children}
    </span>
  );
}
