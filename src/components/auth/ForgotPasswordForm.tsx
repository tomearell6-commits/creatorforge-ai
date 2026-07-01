"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Response is intentionally generic; we show the same message regardless.
    await fetch("/api/auth/forgot-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    }).catch(() => {});
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Check your inbox">
          If this email exists, a reset link has been sent. The link expires shortly for your security.
        </Alert>
        <Link href="/login" className="block text-center text-sm font-medium text-brand-600 hover:underline">Back to log in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Spinner size="sm" className="text-current" /> Sending…</> : "Send reset link"}
      </Button>
      <Link href="/login" className="block text-center text-sm font-medium text-brand-600 hover:underline">Back to log in</Link>
    </form>
  );
}
