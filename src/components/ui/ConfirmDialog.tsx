"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import type { ReactNode } from "react";

/**
 * Accessible modal for confirming destructive / irreversible actions.
 * - role="dialog", aria-modal, aria-labelledby → title
 * - Escape and backdrop click cancel
 * - focus moves into the dialog on open and is trapped while open
 * The confirm button uses the red/danger token when `danger` is set.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  danger = true,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog (confirm button) on open.
  useEffect(() => {
    if (open) dialogRef.current?.querySelector<HTMLButtonElement>("[data-confirm-button]")?.focus();
  }, [open]);

  // Escape closes (cancel); trap Tab focus within the dialog.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!loading) onCancel();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={() => { if (!loading) onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-foreground">{title}</h2>
        {description && (
          <div id={descId} className="mt-2 text-sm text-muted-foreground">{description}</div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button
            data-confirm-button
            variant={danger ? undefined : "primary"}
            className={danger ? "bg-red-600 text-white hover:bg-red-700" : undefined}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" className="text-current" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

/**
 * Small imperative helper. Call `confirm(options)` to open the dialog; it
 * resolves to `true` on confirm and `false` on cancel. Render `dialog` once
 * in your component tree. Set `loading` to disable the buttons while an async
 * action runs (call `close()` when done).
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setState(options);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    if (!result) { setState(null); setLoading(false); }
  }, []);

  const close = useCallback(() => { setState(null); setLoading(false); }, []);

  const dialog = (
    <ConfirmDialog
      open={state !== null}
      title={state?.title ?? ""}
      description={state?.description}
      confirmLabel={state?.confirmLabel}
      cancelLabel={state?.cancelLabel}
      danger={state?.danger}
      loading={loading}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, dialog, loading, setLoading, close };
}
