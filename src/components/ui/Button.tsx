import { cn } from "@/lib/utils";
import { Slot } from "./Slot";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  // Bright lime CTA with dark ink text (CreatorsForge signature button).
  accent: "bg-brand-300 text-brand-900 hover:bg-brand-400 font-semibold",
  secondary: "bg-card text-foreground border border-border hover:bg-muted",
  outline: "border border-border text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
