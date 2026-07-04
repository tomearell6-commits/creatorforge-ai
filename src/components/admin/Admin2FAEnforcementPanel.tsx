"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type Data = { enforced: boolean; admins: { email: string; has2fa: boolean }[] };

/** Admin Panel → Security → 2FA Enforcement. */
export function Admin2FAEnforcementPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/admin/security/2fa")
      .then(async (r) => (r.ok ? r.json() : Promise.reject((await r.json().catch(() => ({}))).error)))
      .then(setData)
      .catch((e) => setError(typeof e === "string" ? e : "Could not load 2FA status."));
  }

  useEffect(load, []);

  async function toggle() {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/security/2fa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enforced: !data.enforced }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not update enforcement.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update enforcement.");
    } finally {
      setSaving(false);
    }
  }

  if (!data && !error) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  const withoutTfa = data?.admins.filter((a) => !a.has2fa) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Admin 2FA Enforcement</CardTitle>
            <CardDescription className="mt-1">
              When active, admins without two-factor authentication are blocked from sensitive admin
              actions until they enable 2FA in their account settings.
            </CardDescription>
          </div>
          {data && <Badge variant={data.enforced ? "success" : "default"}>{data.enforced ? "Active" : "Off"}</Badge>}
        </div>
        {data && (
          <div className="mt-4">
            <Button onClick={toggle} disabled={saving} variant={data.enforced ? "outline" : "primary"}>
              {saving ? "Saving…" : data.enforced ? "Turn enforcement off" : "Enforce 2FA for all admins"}
            </Button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </Card>

      {data && (
        <Card>
          <CardTitle>Admin accounts ({data.admins.length})</CardTitle>
          <CardDescription className="mt-1">
            {withoutTfa.length === 0
              ? "Every admin account is protected with 2FA."
              : `${withoutTfa.length} admin account${withoutTfa.length > 1 ? "s" : ""} without 2FA.`}
          </CardDescription>
          <ul className="mt-4 divide-y divide-border">
            {data.admins.map((a) => (
              <li key={a.email} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{a.email}</span>
                <Badge variant={a.has2fa ? "success" : "warning"}>{a.has2fa ? "2FA enabled" : "No 2FA"}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
