"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export type WorkflowAction = {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "accent" | "secondary" | "outline" | "ghost";
};

export type ActionBarProps = {
  /** Back link/handler shown far left. */
  back?: { label?: string; onClick?: () => void; href?: string };
  /** Secondary actions — left side (Save Draft, Preview, etc.). */
  secondary?: WorkflowAction[];
  /** THE primary action — always far right (Continue / Publish / Approve …). */
  primary?: WorkflowAction;
};

function ActionButton({ a, defaultVariant }: { a: WorkflowAction; defaultVariant: WorkflowAction["variant"] }) {
  const content = (
    <>{a.loading ? <Spinner className="h-4 w-4" /> : a.icon} {a.label}</>
  );
  if (a.href) {
    return <Button asChild variant={a.variant ?? defaultVariant} size="sm"><Link href={a.href}>{content}</Link></Button>;
  }
  return <Button variant={a.variant ?? defaultVariant} size="sm" onClick={a.onClick} disabled={a.disabled || a.loading}>{content}</Button>;
}

/**
 * The universal action bar. Primary action always sits on the right; secondary
 * actions on the left. Consistent labels/positions across every studio so users
 * always know where "Continue" / "Publish" is.
 */
export function WorkflowActionBar({ back, secondary = [], primary }: ActionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-border bg-background/95 px-3 py-2.5 backdrop-blur">
      {back && (
        back.href
          ? <Button asChild variant="ghost" size="sm"><Link href={back.href}><ChevronLeft className="h-4 w-4" /> {back.label ?? "Back"}</Link></Button>
          : <Button variant="ghost" size="sm" onClick={back.onClick}><ChevronLeft className="h-4 w-4" /> {back.label ?? "Back"}</Button>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {secondary.map((a) => <ActionButton key={a.id} a={a} defaultVariant="outline" />)}
      </div>
      {primary && <div className="ml-auto"><ActionButton a={primary} defaultVariant="primary" /></div>}
    </div>
  );
}
