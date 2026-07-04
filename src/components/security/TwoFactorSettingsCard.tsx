"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { TwoFactorSetupModal } from "@/components/security/TwoFactorSetupModal";
import { BackupCodesDisplay } from "@/components/security/BackupCodesDisplay";

type Status = {
  enabled: boolean;
  method: "totp" | "email" | null;
  enabledAt: string | null;
  backupCodesRemaining: number;
};

/** Settings → Security → Two-Factor Authentication. */
export function TwoFactorSettingsCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [mode, setMode] = useState<"idle" | "disable" | "regenerate">("idle");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/security/2fa/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setStatus(s))
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function closeForms() {
    setMode("idle");
    setPassword("");
    setCode("");
    setError(null);
    setLoading(false);
  }

  async function submitDisable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/security/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not disable 2FA.");
      closeForms();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable 2FA.");
      setLoading(false);
    }
  }

  async function submitRegenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/security/2fa/regenerate-backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not regenerate codes.");
      setFreshCodes(data.backupCodes ?? []);
      closeForms();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not regenerate codes.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription className="mt-1">
            2FA adds an extra layer of protection to your CreatorsForge.io account — logging in requires
            your password plus a verification code.
          </CardDescription>
        </div>
        {status && (
          <Badge variant={status.enabled ? "success" : "default"}>{status.enabled ? "Enabled" : "Off"}</Badge>
        )}
      </div>

      {!status ? (
        <div className="mt-4 flex justify-center py-2"><Spinner /></div>
      ) : !status.enabled ? (
        <div className="mt-4">
          <Button onClick={() => setSetupOpen(true)}>Enable 2FA</Button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Method</p>
              <p className="font-medium">{status.method === "email" ? "Email code" : "Authenticator app"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Enabled</p>
              <p className="font-medium">{status.enabledAt ? new Date(status.enabledAt).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Backup codes left</p>
              <p className={`font-medium ${status.backupCodesRemaining <= 2 ? "text-amber-600" : ""}`}>
                {status.backupCodesRemaining} / 10
              </p>
            </div>
          </div>

          {freshCodes && (
            <div>
              <p className="mb-2 text-sm font-semibold">Your new backup codes</p>
              <BackupCodesDisplay codes={freshCodes} />
              <Button variant="ghost" className="mt-2" onClick={() => setFreshCodes(null)}>
                Done — I&apos;ve saved them
              </Button>
            </div>
          )}

          {mode === "idle" && !freshCodes && (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setMode("regenerate")}>Regenerate backup codes</Button>
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-500/10"
                onClick={() => setMode("disable")}
              >
                Disable 2FA
              </Button>
            </div>
          )}

          {mode === "regenerate" && (
            <form onSubmit={submitRegenerate} className="space-y-3 rounded-xl border border-border p-4">
              <p className="text-sm font-semibold">Regenerate backup codes</p>
              <p className="text-xs text-muted-foreground">
                All current backup codes stop working. Confirm your password to continue.
              </p>
              <div>
                <Label htmlFor="regen-password">Password</Label>
                <Input id="regen-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading || !password}>{loading ? "Working…" : "Regenerate"}</Button>
                <Button type="button" variant="ghost" onClick={closeForms}>Cancel</Button>
              </div>
            </form>
          )}

          {mode === "disable" && (
            <form onSubmit={submitDisable} className="space-y-3 rounded-xl border border-red-500/30 p-4">
              <p className="text-sm font-semibold text-red-600">Disable two-factor authentication</p>
              <p className="text-xs text-muted-foreground">
                Your account will be protected by your password only. Confirm your password and a current
                verification code (or a backup code).
              </p>
              <div>
                <Label htmlFor="disable-password">Password</Label>
                <Input id="disable-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="disable-code">Verification or backup code</Label>
                <Input id="disable-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456 or XXXX-XXXX-XXXX" required />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading || !password || !code} className="bg-red-600 text-white hover:bg-red-700">
                  {loading ? "Working…" : "Disable 2FA"}
                </Button>
                <Button type="button" variant="ghost" onClick={closeForms}>Cancel</Button>
              </div>
            </form>
          )}
        </div>
      )}

      <TwoFactorSetupModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onEnabled={() => {
          setSetupOpen(false);
          refresh();
        }}
      />
    </Card>
  );
}
