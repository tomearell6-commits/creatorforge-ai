"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { validatePassword } from "@/lib/security/password";

type Phase = "checking" | "ready" | "invalid" | "done";

export function ResetPasswordForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The /auth/callback exchange establishes a recovery session before we land
  // here. Confirm it exists so we don't show the form for an expired link.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setPhase(data.user ? "ready" : "invalid"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validatePassword(password).ok) { setError("Please meet all the password requirements below."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError(updateError.message); setLoading(false); return; }

    // Log completion + send confirmation email while the session is still active.
    await fetch("/api/auth/reset-complete", { method: "POST" }).catch(() => {});
    await supabase.auth.signOut().catch(() => {});
    setPhase("done");
    setTimeout(() => router.push("/login?reset=success"), 1500);
  }

  if (phase === "checking") return <div className="py-8 text-center"><Spinner size="lg" label="Verifying reset link" /></div>;

  if (phase === "invalid") {
    return (
      <div className="space-y-4">
        <Alert variant="error" title="This reset link is invalid or has expired">
          Reset links expire shortly for your security. Request a new one to continue.
        </Alert>
        <Link href="/forgot-password" className="block text-center text-sm font-medium text-brand-600 hover:underline">Request a new link</Link>
      </div>
    );
  }

  if (phase === "done") {
    return <Alert variant="success" title="Password updated">Redirecting you to log in with your new password…</Alert>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="new-password">New password</Label>
        <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
      </div>
      <PasswordStrengthMeter password={password} />
      <div>
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Spinner size="sm" className="text-current" /> Updating…</> : "Set new password"}
      </Button>
    </form>
  );
}
