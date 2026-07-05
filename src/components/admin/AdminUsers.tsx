"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Row = { user_id: string; full_name: string | null; plan: string; credits: number; status: string; created_at: string };

const USER_STATUS_VARIANT = {
  active: "success",
  suspended: "danger",
} as const;

type EditState = { user: Row; field: "set_credits" | "set_role" } | null;
type ConfirmState = { user: Row; action: "suspend" | "delete" } | null;

export function AdminUsers() {
  const [users, setUsers] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [edit, setEdit] = useState<EditState>(null);
  const [editVal, setEditVal] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    setUsers(json.users ?? []);
  }
  useEffect(() => {
    load();
    // run once on mount; search re-runs load() explicitly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(userId: string, action: string, value?: unknown): Promise<boolean> {
    const res = await fetch("/api/admin/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, value }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg({ kind: "error", text: j.error || "Action failed. Please try again." });
      return false;
    }
    await load();
    return true;
  }

  function openEdit(user: Row, field: "set_credits" | "set_role") {
    setEdit({ user, field });
    setEditVal(field === "set_credits" ? String(user.credits) : user.plan);
  }

  async function saveEdit() {
    if (!edit) return;
    setEditBusy(true); setMsg(null);
    const value = edit.field === "set_credits" ? Number(editVal) : editVal;
    const ok = await act(edit.user.user_id, edit.field, value);
    setEditBusy(false);
    if (ok) { setMsg({ kind: "success", text: edit.field === "set_credits" ? "Credits updated." : "Plan updated." }); setEdit(null); }
  }

  async function runConfirm() {
    if (!confirmState) return;
    setConfirmBusy(true); setMsg(null);
    try {
      if (confirmState.action === "delete") {
        const res = await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: confirmState.user.user_id }) });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setMsg({ kind: "error", text: j.error || "Couldn't delete the user. Please try again." });
          return;
        }
        setMsg({ kind: "success", text: "User deleted." });
        await load();
      } else {
        const ok = await act(confirmState.user.user_id, "suspend");
        if (ok) setMsg({ kind: "success", text: "User suspended." });
      }
    } finally {
      setConfirmBusy(false);
      setConfirmState(null);
    }
  }

  return (
    <div className="space-y-4">
      {msg && <Alert variant={msg.kind}>{msg.text}</Alert>}
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" aria-label="Search users by name" onKeyDown={(e) => e.key === "Enter" && load()} />
        <Button onClick={load}>Search</Button>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr><th className="p-3">User</th><th className="p-3">Plan</th><th className="p-3">Credits</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} className="border-b border-border/50">
                <td className="p-3">
                  <div className="font-medium">{u.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.user_id.slice(0, 8)}…</div>
                </td>
                <td className="p-3 capitalize">{u.plan}</td>
                <td className="p-3">{u.credits}</td>
                <td className="p-3">
                  <Badge variant={USER_STATUS_VARIANT[u.status as keyof typeof USER_STATUS_VARIANT] ?? "default"}>{u.status}</Badge>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {u.status === "suspended"
                      ? <button className="text-green-600 underline" onClick={async () => { const ok = await act(u.user_id, "activate"); if (ok) setMsg({ kind: "success", text: "User activated." }); }}>Activate</button>
                      : <button className="text-amber-600 underline" onClick={() => setConfirmState({ user: u, action: "suspend" })}>Suspend</button>}
                    <button className="text-brand-600 underline" onClick={() => openEdit(u, "set_credits")}>Set credits</button>
                    <button className="text-brand-600 underline" onClick={() => openEdit(u, "set_role")}>Plan</button>
                    <button className="text-red-600 underline" onClick={() => setConfirmState({ user: u, action: "delete" })}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={5}>No users found.</td></tr>}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted-foreground">Secure impersonation is architected but disabled (requires signed short-lived tokens) — see Phase 8.</p>

      <ConfirmDialog
        open={confirmState?.action === "suspend"}
        danger={false}
        title="Suspend user?"
        description={confirmState ? `Suspend ${confirmState.user.full_name ?? confirmState.user.user_id.slice(0, 8)}? They will lose access until reactivated.` : undefined}
        confirmLabel="Suspend"
        loading={confirmBusy}
        onConfirm={runConfirm}
        onCancel={() => setConfirmState(null)}
      />

      <ConfirmDialog
        open={confirmState?.action === "delete"}
        title="Delete user?"
        description={confirmState ? `Permanently delete ${confirmState.user.full_name ?? confirmState.user.user_id.slice(0, 8)} and all their data? This can't be undone.` : undefined}
        confirmLabel="Delete"
        loading={confirmBusy}
        onConfirm={runConfirm}
        onCancel={() => setConfirmState(null)}
      />

      {edit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => { if (!editBusy) setEdit(null); }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={edit.field === "set_credits" ? "Set credits" : "Set plan"}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-foreground">
              {edit.field === "set_credits" ? "Set credits" : "Set plan"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{edit.user.full_name ?? edit.user.user_id.slice(0, 8)}</p>
            <div className="mt-4">
              {edit.field === "set_credits" ? (
                <>
                  <Label htmlFor="admin-edit-credits">Credits</Label>
                  <Input id="admin-edit-credits" type="number" autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} />
                </>
              ) : (
                <>
                  <Label htmlFor="admin-edit-plan">Plan</Label>
                  <select
                    id="admin-edit-plan"
                    autoFocus
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    {["free", "creator", "pro", "agency"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEdit(null)} disabled={editBusy}>Cancel</Button>
              <Button onClick={saveEdit} disabled={editBusy}>{editBusy ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
