"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { QRCodeDisplay } from "@/components/security/QRCodeDisplay";
import { TwoFactorCodeInput } from "@/components/security/TwoFactorCodeInput";
import { BackupCodesDisplay } from "@/components/security/BackupCodesDisplay";

type Step = "method" | "verify" | "backup";
type Method = "totp" | "email";

/**
 * Guided enrollment: pick method → scan QR (or receive email) → enter code →
 * save backup codes. Nothing is enabled until the code verifies server-side.
 */
export function TwoFactorSetupModal({ open, onClose, onEnabled }: { open: boolean; onClose: () => void; onEnabled: () => void }) {
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<Method>("totp");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setStep("method");
    setMethod("totp");
    setQrDataUrl("");
    setSecret("");
    setSentTo("");
    setCode("");
    setBackupCodes([]);
    setError(null);
    setLoading(false);
  }

  async function begin(m: Method) {
    setMethod(m);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/security/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: m }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not start setup.");
      if (m === "totp") {
        setQrDataUrl(data.qrDataUrl);
        setSecret(data.secret);
      } else {
        setSentTo(data.sentTo);
      }
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start setup.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(value?: string) {
    const attempt = (value ?? code).trim();
    if (attempt.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/security/2fa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: attempt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Verification failed.");
      setBackupCodes(data.backupCodes ?? []);
      setStep("backup");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => { if (!loading && step !== "backup") { reset(); onClose(); } }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set up two-factor authentication"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "method" && (
          <>
            <h2 className="text-lg font-semibold">Protect your account with 2FA</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              2FA adds an extra layer of protection to your CreatorsForge.io account. Choose how you want to
              receive verification codes.
            </p>
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => begin("totp")}
                disabled={loading}
                className="w-full rounded-xl border border-brand-500/50 bg-brand-500/5 p-4 text-left transition hover:border-brand-500 disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Authenticator app</span>
                  <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-semibold text-brand-600">Recommended</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Google Authenticator, Microsoft Authenticator, Authy or 1Password. Works offline.
                </p>
              </button>
              <button
                type="button"
                onClick={() => begin("email")}
                disabled={loading}
                className="w-full rounded-xl border border-border p-4 text-left transition hover:border-brand-500/50 disabled:opacity-50"
              >
                <span className="font-semibold">Email verification code</span>
                <p className="mt-1 text-xs text-muted-foreground">A 6-digit code is emailed to you at each login.</p>
              </button>
            </div>
            {loading && <div className="mt-4 flex justify-center"><Spinner /></div>}
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            <div className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            </div>
          </>
        )}

        {step === "verify" && (
          <>
            <h2 className="text-lg font-semibold">
              {method === "totp" ? "Scan the QR code" : "Check your email"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {method === "totp"
                ? "Open your authenticator app, add an account, and scan this code. Then enter the 6-digit code it shows."
                : `We sent a 6-digit code to ${sentTo}. Enter it below.`}
            </p>
            {method === "totp" && (
              <div className="mt-4">
                <QRCodeDisplay qrDataUrl={qrDataUrl} secret={secret} />
              </div>
            )}
            <div className="mt-5">
              <TwoFactorCodeInput value={code} onChange={setCode} onComplete={(v) => verify(v)} disabled={loading} />
            </div>
            {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}
            <div className="mt-5 flex justify-between">
              <Button variant="ghost" onClick={() => { setStep("method"); setCode(""); setError(null); }} disabled={loading}>
                Back
              </Button>
              <Button onClick={() => verify()} disabled={loading || code.length !== 6}>
                {loading ? "Verifying…" : "Verify & enable"}
              </Button>
            </div>
          </>
        )}

        {step === "backup" && (
          <>
            <h2 className="text-lg font-semibold">2FA is on — save your backup codes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Two-factor authentication is now protecting your account.
            </p>
            <div className="mt-4">
              <BackupCodesDisplay codes={backupCodes} />
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => { reset(); onEnabled(); }}>I&apos;ve saved my backup codes</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
