import { Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Variant = "info" | "success" | "warning" | "error";

const styles: Record<Variant, { box: string; icon: typeof Info }> = {
  info: { box: "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300", icon: Info },
  success: { box: "bg-brand-50 text-brand-800 dark:bg-brand-950/30 dark:text-brand-300", icon: CheckCircle2 },
  warning: { box: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300", icon: AlertTriangle },
  error: { box: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300", icon: XCircle },
};

/**
 * Canonical inline message for validation, errors, success, and warnings.
 * `role="alert"` for error/warning so assistive tech announces it; optional
 * retry action for recoverable failures (network/API/render/publish).
 */
export function Alert({
  variant = "info",
  title,
  children,
  action,
  className,
}: {
  variant?: Variant;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { box, icon: Icon } = styles[variant];
  return (
    <div
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-lg px-4 py-3 text-sm", box, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
