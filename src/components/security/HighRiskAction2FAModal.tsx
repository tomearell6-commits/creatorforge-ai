"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TwoFactorCodeInput } from "@/components/security/TwoFactorCodeInput";

/**
 * Confirmation gate for high-risk actions (password change, payout settings,
 * key rotation, …). Verifies a current 2FA/backup code via
 * /api/security/2fa/verify-action and hands the 5-minute action token to
 * `onVerified` — the caller sends it as the `x-2fa-token` request header.
 */
export function HighRiskAction2FAModal({
  open,
  actionLabel,
  onVerified,
  onCancel,
}: {
  open: boolean;
  actionLabel: string;
  onVerified: (actionToken: string) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [backupMode, setBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(value?: string) {
    const attempt = (value ?? (backupMode ? backupCode : code)).trim();
    if (!attempt) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/security/2fa/verify-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: attempt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Verification failed.");
      setCode("");
      setBackupCode("");
      setLoading(false);
      onVerified(data.actionToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => !loading && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm with two-factor authentication"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Confirm it&apos;s you</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          For your security, {actionLabel} requires a verification code.
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {backupMode ? (
            <input
              autoFocus
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              aria-label="Backup code"
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-center font-mono text-base tracking-widest focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          ) : (
            <TwoFactorCodeInput value={code} onChange={setCode} onComplete={(v) => submit(v)} disabled={loading} />
          )}
          {error && <p className="text-center text-sm text-red-500">{error}</p>}
          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Verifying…" : "Confirm"}</Button>
          </div>
        </form>
        <button
          type="button"
          className="mt-3 text-xs text-brand-600 hover:underline"
          onClick={() => { setBackupMode(!backupMode); setError(null); }}
        >
          {backupMode ? "Use a verification code instead" : "Use a backup code instead"}
        </button>
      </div>
    </div>
  );
}
