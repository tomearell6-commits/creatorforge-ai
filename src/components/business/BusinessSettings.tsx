"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Copy } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AUTOMATION_MODES, AUTOPILOT_FORBIDDEN, type AutomationMode } from "@/config/businessOps";
import { cn } from "@/lib/utils";

type Settings = { automation_mode: AutomationMode; form_key: string; daily_digest: boolean };

export function BusinessSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [confirmAutopilot, setConfirmAutopilot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/business/settings").then((r) => (r.ok ? r.json() : null)).then((d) => setSettings(d?.settings ?? null)).catch(() => {});
  }, []);

  async function save(patch: Record<string, unknown>) {
    setError(null);
    const res = await fetch("/api/business/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setError(d.error ?? "Save failed."); return; }
    setSettings(d.settings);
  }

  function pickMode(mode: AutomationMode) {
    if (mode === "autopilot") { setConfirmAutopilot(true); return; }
    save({ automation_mode: mode });
  }

  if (!settings) return <div className="flex justify-center py-12"><Spinner /></div>;

  const intakeSnippet = `fetch("https://www.creatorsforge.io/api/business/inquiries/intake", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    key: "${settings.form_key}",
    name: nameField, email: emailField,
    subject: subjectField, message: messageField
  })
})`;

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Automation mode</CardTitle>
        <CardDescription className="mt-1">How much the AI does on its own. You can change this anytime.</CardDescription>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {AUTOMATION_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => pickMode(m.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                settings.automation_mode === m.id ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/40" : "border-border hover:border-brand-500/50"
              )}
            >
              <p className="font-semibold">{m.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          <p className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
            <ShieldAlert className="h-3.5 w-3.5" /> Autopilot never does these without your explicit approval:
          </p>
          <ul className="mt-1.5 grid list-inside list-disc gap-x-4 sm:grid-cols-2">
            {AUTOPILOT_FORBIDDEN.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      </Card>

      <Card>
        <CardTitle>Website inquiry form</CardTitle>
        <CardDescription className="mt-1">
          Point your website contact form at this endpoint and submissions land in your Inquiry Center automatically.
        </CardDescription>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-muted/60 p-3 text-xs">{intakeSnippet}</pre>
        <Button
          size="sm" variant="ghost" className="mt-2"
          onClick={async () => { try { await navigator.clipboard.writeText(intakeSnippet); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* no clipboard */ } }}
        >
          <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy snippet"}
        </Button>
        <p className="mt-2 text-[11px] text-muted-foreground">
          The key identifies your account only — it cannot read any data. Treat it like a form ID, not a password.
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Daily digest</CardTitle>
            <CardDescription className="mt-1">Include Business Ops in your notification digests.</CardDescription>
          </div>
          <Button variant={settings.daily_digest ? "outline" : "primary"} onClick={() => save({ daily_digest: !settings.daily_digest })}>
            {settings.daily_digest ? "On — turn off" : "Off — turn on"}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmAutopilot}
        title="Enable Autopilot?"
        description={
          <>
            <p>Autopilot may publish content and schedule campaigns <strong>you have already approved</strong>, and generate reports.</p>
            <p className="mt-2">It will <strong>never</strong> negotiate pricing, approve refunds, accept contracts, handle legal matters or disputes, change billing, delete data, or send customer replies without your approval.</p>
          </>
        }
        confirmLabel="I understand — enable Autopilot"
        danger={false}
        onConfirm={() => {
          setConfirmAutopilot(false);
          save({ automation_mode: "autopilot", acknowledge: true });
        }}
        onCancel={() => setConfirmAutopilot(false)}
      />
    </div>
  );
}
