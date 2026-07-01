"use client";

import { useEffect, useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

/** The nine agreement points a user accepts before running compliant outreach. */
const POINTS = [
  "I will only collect and use publicly available business contact data.",
  "I will not target private individuals or collect personal (non-business) information.",
  "I will not access hidden, gated, or non-public data.",
  "I will not bypass logins, paywalls, CAPTCHAs, or other access controls.",
  "I will not send spam or unsolicited bulk email in violation of applicable law.",
  "Every campaign I send will include clear unsubscribe text.",
  "I will respect unsubscribed and do-not-contact requests and never re-contact them.",
  "I will review my leads before any outreach and take responsibility for who I contact.",
  "I will follow all applicable email, anti-spam, and privacy laws (e.g. CAN-SPAM, GDPR).",
];

/**
 * Accessible modal presenting the Lead Generation Compliance Policy. On accept
 * it POSTs to /api/leads/compliance/accept, then closes and calls onAccepted.
 */
export function ComplianceModal({
  open,
  onClose,
  onAccepted,
}: {
  open: boolean;
  onClose: () => void;
  onAccepted?: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAgreed(false);
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/compliance/accept", { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Could not record acceptance.");
      onAccepted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compliance-modal-title"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" aria-hidden />
            <h2 id="compliance-modal-title" className="text-lg font-semibold">
              Lead Generation Compliance Policy
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          To keep outreach lawful and permission-based, please review and agree to the following.
        </p>

        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          {POINTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>

        {error && (
          <Alert variant="error" className="mt-4">
            {error}
          </Alert>
        )}

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          <span>I have read and agree to the Lead Generation Compliance Policy.</span>
        </label>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="accent" disabled={!agreed || busy} onClick={accept}>
            {busy ? (
              <>
                <Spinner size="sm" /> Saving…
              </>
            ) : (
              "Accept"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
