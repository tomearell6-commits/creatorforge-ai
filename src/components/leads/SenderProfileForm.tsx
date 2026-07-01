"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

type Profile = {
  sender_name: string;
  business_name: string;
  business_website: string;
  business_email: string;
  business_address: string;
  reply_to_email: string;
  unsubscribe_footer: string;
  compliance_confirmed: boolean;
  completed: boolean;
};

const EMPTY: Profile = {
  sender_name: "",
  business_name: "",
  business_website: "",
  business_email: "",
  business_address: "",
  reply_to_email: "",
  unsubscribe_footer: "",
  compliance_confirmed: false,
  completed: false,
};

/**
 * Sender profile editor. Every outreach email is sent under this identity, so
 * the profile must be complete (and compliance-confirmed) before sending.
 */
export function SenderProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/leads/sender-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProfile({ ...EMPTY, ...(d?.profile ?? {}) }))
      .catch(() => setProfile({ ...EMPTY }));
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    setSaved(false);
  }

  async function save() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/leads/sender-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Could not save profile.");
      const { profile: saved } = await res.json();
      setProfile({ ...EMPTY, ...(saved ?? {}) });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner size="sm" /> Loading sender profile…
      </div>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>Sender profile</CardTitle>
          <CardDescription>The business identity every outreach email is sent under.</CardDescription>
        </div>
        <Badge variant={profile.completed ? "success" : "warning"}>
          {profile.completed ? "Complete" : "Incomplete"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sp-sender-name">Sender name *</Label>
          <Input id="sp-sender-name" value={profile.sender_name} onChange={(e) => set("sender_name", e.target.value)} placeholder="Jane Doe" />
        </div>
        <div>
          <Label htmlFor="sp-business-name">Business name *</Label>
          <Input id="sp-business-name" value={profile.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Acme Co." />
        </div>
        <div>
          <Label htmlFor="sp-business-email">Business email *</Label>
          <Input id="sp-business-email" type="email" value={profile.business_email} onChange={(e) => set("business_email", e.target.value)} placeholder="hello@acme.com" />
        </div>
        <div>
          <Label htmlFor="sp-reply-to">Reply-to email *</Label>
          <Input id="sp-reply-to" type="email" value={profile.reply_to_email} onChange={(e) => set("reply_to_email", e.target.value)} placeholder="reply@acme.com" />
        </div>
        <div>
          <Label htmlFor="sp-website">Business website</Label>
          <Input id="sp-website" value={profile.business_website} onChange={(e) => set("business_website", e.target.value)} placeholder="https://acme.com" />
        </div>
        <div>
          <Label htmlFor="sp-address">Business address</Label>
          <Input id="sp-address" value={profile.business_address} onChange={(e) => set("business_address", e.target.value)} placeholder="123 Main St, City, Country" />
        </div>
      </div>

      <div>
        <Label htmlFor="sp-unsub">Unsubscribe footer</Label>
        <Textarea
          id="sp-unsub"
          rows={2}
          value={profile.unsubscribe_footer}
          onChange={(e) => set("unsubscribe_footer", e.target.value)}
          placeholder="You received this email because… To unsubscribe, click the link below."
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Physical address and an unsubscribe link are legally required in outreach emails.
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={profile.compliance_confirmed}
          onChange={(e) => set("compliance_confirmed", e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        <span>I confirm this sender identity is accurate and that I will only send compliant, permission-based outreach.</span>
      </label>

      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">Sender profile saved.</Alert>}

      <div className="flex justify-end">
        <Button variant="accent" disabled={busy} onClick={save}>
          {busy ? (
            <>
              <Spinner size="sm" /> Saving…
            </>
          ) : (
            "Save profile"
          )}
        </Button>
      </div>
    </Card>
  );
}
