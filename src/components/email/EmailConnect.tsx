"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ShieldCheck, TestTube } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { PERMISSION_MODES, DEFAULT_PERMISSION_MODE, type PermissionMode } from "@/lib/email-assistant/safety";

const PROVIDERS = [
  { id: "gmail", label: "Gmail", note: "Google OAuth" },
  { id: "google-workspace", label: "Google Workspace", note: "Google OAuth" },
  { id: "outlook", label: "Outlook", note: "Microsoft OAuth" },
  { id: "microsoft365", label: "Microsoft 365", note: "Microsoft OAuth" },
  { id: "imap", label: "IMAP", note: "Coming soon" },
  { id: "demo", label: "Demo Inbox", note: "Sample data — try the full flow" },
];

/** EmailConnectCard + EmailPermissionSelector + explicit consent screen. */
export function EmailConnect() {
  const router = useRouter();
  const [provider, setProvider] = useState("demo");
  const [mode, setMode] = useState<PermissionMode>(DEFAULT_PERMISSION_MODE);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email/connect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, permissionMode: mode, consent }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Connection failed");
      if (json.authorizeUrl) { window.location.href = json.authorizeUrl; return; }
      if (json.connected) router.push("/dashboard/email?connected=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4 text-brand-600" /> Choose your email provider</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PROVIDERS.map((p) => (
            <button key={p.id} onClick={() => setProvider(p.id)} disabled={p.id === "imap"}
              className={`rounded-lg border p-3 text-left disabled:opacity-50 ${provider === p.id ? "border-brand-500 ring-1 ring-brand-500" : "border-border hover:bg-muted"}`}>
              <div className="flex items-center gap-1.5 text-sm font-medium">{p.id === "demo" && <TestTube className="h-3.5 w-3.5 text-brand-600" />}{p.label}</div>
              <div className="text-[11px] text-muted-foreground">{p.note}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">We use official OAuth — you sign in with the provider directly. CreatorsForge never sees or asks for your email password.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-brand-600" /> Choose what the AI is allowed to do</h2>
        <div className="mt-3 space-y-2">
          {PERMISSION_MODES.map((m) => (
            <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${mode === m.id ? "border-brand-500 ring-1 ring-brand-500" : "border-border hover:bg-muted"}`}>
              <input type="radio" name="mode" checked={mode === m.id} onChange={() => setMode(m.id)} className="mt-1 accent-lime-600" />
              <span>
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="block text-xs text-muted-foreground">{m.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Consent screen */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
        <p className="font-medium text-amber-900 dark:text-amber-200">Your consent</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-800 dark:text-amber-300">
          <li>CreatorsForge will read your recent inbox messages to summarize and prioritize them.</li>
          <li>Nothing is ever sent without your approval (or an explicitly safe rule you enable).</li>
          <li>Legal, billing, security, medical, and dispute emails are never auto-sent — ever.</li>
          <li>You can disconnect and permanently delete all stored email data at any time.</li>
          <li>Access tokens are encrypted; administrators cannot read your email content.</li>
        </ul>
        <label className="mt-3 flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="accent-lime-600" />
          I understand and consent to connecting this account.
        </label>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      <Button onClick={connect} disabled={!consent || busy} className="w-full">
        {busy ? <Spinner size="sm" className="text-current" /> : <Mail className="h-4 w-4" />}
        {provider === "demo" ? "Create demo inbox" : `Connect ${PROVIDERS.find((p) => p.id === provider)?.label}`}
      </Button>
    </div>
  );
}
