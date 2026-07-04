"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { validatePassword } from "@/lib/security/password";
import { HighRiskAction2FAModal } from "@/components/security/HighRiskAction2FAModal";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [tfaOpen, setTfaOpen] = useState(false);

  async function send(actionToken?: string) {
    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(actionToken ? { "x-2fa-token": actionToken } : {}) },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    // Accounts with 2FA must confirm with a fresh code first.
    if (res.status === 403 && data.code === "2FA_REQUIRED") { setTfaOpen(true); return; }
    if (!res.ok) { setError(data.error || "Couldn't change your password."); return; }
    setCurrent(""); setNext(""); setConfirm(""); setDone(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setDone(false);
    if (!validatePassword(next).ok) { setError("Your new password doesn't meet all the requirements below."); return; }
    if (next !== confirm) { setError("New passwords don't match."); return; }
    await send();
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-brand-600" />
        <div>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>Use a strong, unique password. We&apos;ll email you a confirmation and sign out your other devices.</CardDescription>
        </div>
      </div>

      {done && <Alert variant="success" title="Password changed">Your password was updated and a confirmation email is on its way.</Alert>}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="current-password">Current password</Label>
          <Input id="current-password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </div>
        <div>
          <Label htmlFor="settings-new-password">New password</Label>
          <Input id="settings-new-password" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
        </div>
        <PasswordStrengthMeter password={next} />
        <div>
          <Label htmlFor="settings-confirm-password">Confirm new password</Label>
          <Input id="settings-confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? <><Spinner size="sm" className="text-current" /> Updating…</> : "Update password"}
        </Button>
      </form>

      <HighRiskAction2FAModal
        open={tfaOpen}
        actionLabel="changing your password"
        onCancel={() => setTfaOpen(false)}
        onVerified={(token) => {
          setTfaOpen(false);
          send(token);
        }}
      />
    </Card>
  );
}
