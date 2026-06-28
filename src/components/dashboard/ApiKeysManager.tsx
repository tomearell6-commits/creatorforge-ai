"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { API_SCOPES } from "@/lib/constants";
import type { ApiKey } from "@/lib/types";

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/api-keys");
    const json = await res.json();
    setKeys(json.keys ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true); setNewSecret(null);
    const res = await fetch("/api/api-keys", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scopes }),
    });
    const json = await res.json();
    if (json.secret) setNewSecret(json.secret);
    setName(""); setScopes([]);
    await load();
    setBusy(false);
  }

  async function act(id: string, action: "revoke" | "rotate") {
    const res = await fetch(`/api/api-keys/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (json.secret) setNewSecret(json.secret);
    await load();
  }

  async function del(id: string) {
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <h3 className="font-semibold">Create an API key</h3>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name (e.g. Production)" />
        <div className="flex flex-wrap gap-2">
          {API_SCOPES.map((s) => (
            <button key={s.value} type="button"
              onClick={() => setScopes((p) => p.includes(s.value) ? p.filter((x) => x !== s.value) : [...p, s.value])}
              className={`rounded-full border px-3 py-1 text-xs ${scopes.includes(s.value) ? "border-brand-600 bg-brand-600 text-white" : "border-border"}`}>
              {s.label}
            </button>
          ))}
        </div>
        <Button disabled={busy} onClick={create}>{busy ? "Creating…" : "Generate key"}</Button>
      </Card>

      {newSecret && (
        <Card className="border-brand-300 bg-brand-50 dark:bg-brand-900/20">
          <p className="text-sm font-medium">Copy your key now — it will not be shown again:</p>
          <code className="mt-2 block break-all rounded bg-background p-2 text-xs">{newSecret}</code>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold">Your keys</h3>
        <div className="mt-3 space-y-2">
          {keys.length === 0 && <p className="text-sm text-muted-foreground">No keys yet.</p>}
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
              <div>
                <div className="font-medium">{k.name} {k.revoked && <span className="text-xs text-red-600">(revoked)</span>}</div>
                <div className="text-xs text-muted-foreground">
                  <code>{k.key_prefix}…</code> · {k.request_count} reqs · limit {k.rate_limit}/min · {k.scopes.join(", ") || "no scopes"}
                </div>
              </div>
              <div className="flex gap-2">
                {!k.revoked && <button className="text-xs text-brand-600 underline" onClick={() => act(k.id, "rotate")}>Rotate</button>}
                {!k.revoked && <button className="text-xs text-amber-600 underline" onClick={() => act(k.id, "revoke")}>Revoke</button>}
                <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => del(k.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">Using the API</h3>
        <p className="mt-2 text-sm text-muted-foreground">Send your key as a Bearer token. Base URL <code>/api/v1</code> (coming online with real endpoints).</p>
        <pre className="mt-2 overflow-x-auto rounded bg-background p-3 text-xs">{`curl https://www.creatorsforge.io/api/v1/scripts \\
  -H "Authorization: Bearer cfk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"category":"horror-stories","idea":"a haunted lighthouse"}'`}</pre>
      </Card>
    </div>
  );
}
