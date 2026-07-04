"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { TwoFactorCodeInput } from "@/components/security/TwoFactorCodeInput";

type Status = { enabled: boolean; method: "totp" | "email" | null; verifiedThisBrowser: boolean };

/** Second login step: authenticator / email code, or a backup code. */
export function TwoFactorLoginStep() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [status, setStatus] = useState<Status | null>(null);
  const [code, setCode] = useState("");
  const [backupMode, setBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/security/2fa/status")
      .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.text())))
      .then((s: Status) => {
        if (!s.enabled || s.verifiedThisBrowser) {
          router.replace(redirectTo);
          return;
        }
        setStatus(s);
        if (s.method === "email") sendEmailCode(false);
      })
      .catch(() => router.replace("/login"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendEmailCode(manual: boolean) {
    try {
      const r = await fetch("/api/security/2fa/email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "login" }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setInfo(`We emailed a verification code to ${d.sentTo}.`);
      else if (manual) setError(d.error ?? "Could not send the code.");
    } catch {
      if (manual) setError("Could not send the code.");
    }
  }

  async function submit(value?: string) {
    const attempt = (value ?? (backupMode ? backupCode : code)).trim();
    if (!attempt) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/security/2fa/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: attempt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Verification failed.");
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
      setLoading(false);
    }
  }

  async function useDifferentAccount() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!status) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Two-step verification</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {backupMode
          ? "Enter one of your backup codes (each works once)."
          : status.method === "email"
            ? "Enter the 6-digit code we emailed you."
            : "Enter the 6-digit code from your authenticator app."}
      </p>

      <form
        className="mt-6 space-y-4"
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
            className="w-full rounded-lg border border-border bg-background px-3 py-3 text-center font-mono text-lg tracking-widest focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        ) : (
          <TwoFactorCodeInput value={code} onChange={setCode} onComplete={(v) => submit(v)} disabled={loading} />
        )}

        {info && !backupMode && <p className="text-center text-xs text-muted-foreground">{info}</p>}
        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Verifying…" : "Verify"}
        </Button>
      </form>

      <div className="mt-4 space-y-2 text-center text-xs">
        {status.method === "email" && !backupMode && (
          <button type="button" onClick={() => sendEmailCode(true)} className="text-brand-600 hover:underline">
            Resend code
          </button>
        )}
        <div>
          <button
            type="button"
            onClick={() => {
              setBackupMode(!backupMode);
              setError(null);
            }}
            className="text-brand-600 hover:underline"
          >
            {backupMode ? "Use a verification code instead" : "Use a backup code instead"}
          </button>
        </div>
        <div>
          <button type="button" onClick={useDifferentAccount} className="text-muted-foreground hover:underline">
            Log in with a different account
          </button>
        </div>
      </div>
    </div>
  );
}
