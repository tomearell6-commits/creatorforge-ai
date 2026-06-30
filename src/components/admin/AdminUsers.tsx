"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

type Row = { user_id: string; full_name: string | null; plan: string; credits: number; status: string; created_at: string };

const USER_STATUS_VARIANT = {
  active: "success",
  suspended: "danger",
} as const;

export function AdminUsers() {
  const [users, setUsers] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    setUsers(json.users ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function act(userId: string, action: string, value?: unknown) {
    await fetch("/api/admin/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, value }),
    });
    await load();
  }
  async function del(userId: string) {
    if (!confirm("Permanently delete this user and all their data?")) return;
    await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    await load();
  }

  return (
    <div className="space-y-4">
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
                      ? <button className="text-green-600 underline" onClick={() => act(u.user_id, "activate")}>Activate</button>
                      : <button className="text-amber-600 underline" onClick={() => act(u.user_id, "suspend")}>Suspend</button>}
                    <button className="text-brand-600 underline" onClick={() => { const v = prompt("Set credits to:", String(u.credits)); if (v !== null) act(u.user_id, "set_credits", Number(v)); }}>Set credits</button>
                    <button className="text-brand-600 underline" onClick={() => { const v = prompt("Set plan (free/creator/pro/agency):", u.plan); if (v) act(u.user_id, "set_role", v); }}>Plan</button>
                    <button className="text-red-600 underline" onClick={() => del(u.user_id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={5}>No users found.</td></tr>}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted-foreground">Secure impersonation is architected but disabled (requires signed short-lived tokens) — see Phase 8.</p>
    </div>
  );
}
