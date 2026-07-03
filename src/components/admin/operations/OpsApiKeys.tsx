"use client";

import { useState } from "react";
import { KeyRound, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { OpsBadge, OpsLoading, useOps, fmtDate, fmtDateTime } from "./ui";

type KeyRow = {
  id: string; provider_id: string; key_name: string; environment: string; masked_value: string | null;
  created_date: string | null; last_used_at: string | null; last_rotated_at: string | null;
  rotation_days: number; computedStatus: string; rotationDue: string | null; daysUntilDue: number | null;
  risk_level: string; notes: string | null; configured: boolean;
};

export function OpsApiKeys() {
  const { data, loading, error, reload } = useOps<{ keys: KeyRow[] }>("/api/admin/operations/api-keys");
  const [busy, setBusy] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const markRotated = async (id: string) => {
    setBusy(id);
    try {
      await fetch("/api/admin/operations/mark-rotated", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: id, notes: noteFor === id && note ? note : undefined }),
      });
      setNoteFor(null); setNote("");
      await reload();
    } finally { setBusy(null); }
  };

  const saveNote = async (id: string) => {
    setBusy(id);
    try {
      await fetch("/api/admin/operations/api-keys", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes: note }),
      });
      setNoteFor(null); setNote("");
      await reload();
    } finally { setBusy(null); }
  };

  if (loading) return <OpsLoading />;
  if (error || !data) return <Alert variant="error">{error ?? "Failed to load"}</Alert>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Full keys are never stored or displayed — only masked hints. Rotate at the provider, update
        Vercel, then click <strong>Mark rotated</strong>.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Provider</th>
              <th className="px-3 py-2 font-medium">Key</th>
              <th className="px-3 py-2 font-medium">Env</th>
              <th className="px-3 py-2 font-medium">Last rotated</th>
              <th className="px-3 py-2 font-medium">Due</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Risk</th>
              <th className="px-3 py-2 font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {data.keys.map((k) => (
              <tr key={k.id} className="border-b border-border align-top last:border-0">
                <td className="px-3 py-2.5 font-medium">{k.provider_id}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-mono text-xs">{k.masked_value ?? k.key_name}</span></div>
                  {k.last_used_at && <div className="text-[11px] text-muted-foreground">used {fmtDateTime(k.last_used_at)}</div>}
                  {k.notes && <div className="mt-0.5 max-w-[220px] truncate text-[11px] text-muted-foreground">📝 {k.notes}</div>}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{k.environment}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(k.last_rotated_at)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(k.rotationDue)}{k.daysUntilDue != null && <span className="block text-[11px]">({k.daysUntilDue}d)</span>}</td>
                <td className="px-3 py-2.5"><OpsBadge status={k.computedStatus} /></td>
                <td className="px-3 py-2.5"><OpsBadge status={k.risk_level === "high" ? "critical" : k.risk_level === "low" ? "healthy" : "attention"} /></td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col items-end gap-1">
                    <Button size="sm" variant="secondary" onClick={() => markRotated(k.id)} disabled={busy === k.id}>
                      <Check className="h-3.5 w-3.5" /> Mark rotated
                    </Button>
                    {noteFor === k.id ? (
                      <span className="flex gap-1">
                        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rotation note" className="w-36 rounded border border-border bg-background px-1.5 py-0.5 text-xs" />
                        <Button size="sm" variant="ghost" onClick={() => saveNote(k.id)} disabled={busy === k.id}>Save</Button>
                      </span>
                    ) : (
                      <button onClick={() => { setNoteFor(k.id); setNote(k.notes ?? ""); }} className="text-[11px] text-muted-foreground hover:text-foreground">Add note</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
