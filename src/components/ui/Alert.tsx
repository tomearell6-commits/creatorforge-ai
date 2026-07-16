import { Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Variant = "info" | "success" | "warning" | "error";

// Semantic status colors (NOT the brand lime, which is a decorative accent):
// a thick colored left border + saturated icon + high-contrast text so every
// message reads clearly in light and dark. Success = emerald green.
const styles: Record<Variant, { box: string; iconColor: string; icon: typeof Info }> = {
  info: { box: "border-l-4 border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-100", iconColor: "text-blue-600 dark:text-blue-400", icon: Info },
  success: { box: "border-l-4 border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100", iconColor: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
  warning: { box: "border-l-4 border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-100", iconColor: "text-amber-600 dark:text-amber-400", icon: AlertTriangle },
  error: { box: "border-l-4 border-red-500 bg-red-50 text-red-900 dark:border-red-400 dark:bg-red-950/40 dark:text-red-100", iconColor: "text-red-600 dark:text-red-400", icon: XCircle },
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
  const { box, iconColor, icon: Icon } = styles[variant];
  return (
    <div
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-lg px-4 py-3 text-sm", box, className)}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
