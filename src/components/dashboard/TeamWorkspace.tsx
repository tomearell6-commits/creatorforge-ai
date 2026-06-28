"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { WORKSPACE_ROLES } from "@/lib/constants";
import type { ActivityLog, WorkspaceMember, WorkspaceRole } from "@/lib/types";

type Workspace = { id: string; name: string; owner_id: string; workspace_members: WorkspaceMember[] };

export function TeamWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [newName, setNewName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("editor");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/workspaces");
    const json = await res.json();
    setWorkspaces(json.workspaces ?? []);
    setActivity(json.activity ?? []);
  }
  useEffect(() => { load(); }, []);

  async function createWs() {
    if (!newName.trim()) return;
    await fetch("/api/workspaces", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setNewName("");
    await load();
  }

  const ws = workspaces[0];

  async function invite() {
    if (!ws || !email.trim()) return;
    setMsg(null);
    const res = await fetch("/api/workspaces/members", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: ws.id, email, role }),
    });
    const json = await res.json();
    if (!res.ok) setMsg(json.error ?? "Failed");
    else { setEmail(""); setMsg("Invitation added."); await load(); }
  }

  async function changeRole(memberId: string, newRole: WorkspaceRole) {
    await fetch("/api/workspaces/members", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, workspaceId: ws!.id, role: newRole }),
    });
    await load();
  }

  async function removeMember(memberId: string) {
    await fetch("/api/workspaces/members", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, workspaceId: ws!.id }),
    });
    await load();
  }

  if (!ws) {
    return (
      <Card className="space-y-3">
        <h3 className="font-semibold">Create a workspace</h3>
        <p className="text-sm text-muted-foreground">Workspaces let you invite teammates and share projects.</p>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Workspace name" />
        <Button onClick={createWs}>Create workspace</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{ws.name}</h3>
          <span className="text-xs text-muted-foreground">{ws.workspace_members?.length ?? 0} member(s)</span>
        </div>

        <div className="space-y-2">
          {ws.workspace_members?.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
              <div>
                <div className="font-medium">{m.invited_email ?? m.user_id ?? "Member"}</div>
                <div className="text-xs text-muted-foreground">{m.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <select className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                  value={m.role} disabled={m.role === "owner"} onChange={(e) => changeRole(m.id, e.target.value as WorkspaceRole)}>
                  {WORKSPACE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {m.role !== "owner" && (
                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => removeMember(m.id)}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium">Invite a member</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input className="flex-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@email.com" />
            <select className="rounded-lg border border-border bg-background px-3 text-sm"
              value={role} onChange={(e) => setRole(e.target.value as WorkspaceRole)}>
              {WORKSPACE_ROLES.filter((r) => r.value !== "owner").map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <Button onClick={invite}>Invite</Button>
          </div>
          {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">Activity log</h3>
        <div className="mt-3 space-y-1 text-sm">
          {activity.length === 0 && <p className="text-muted-foreground">No activity yet.</p>}
          {activity.map((a) => (
            <div key={a.id} className="flex justify-between border-b border-border/50 py-1 last:border-0">
              <span>{a.action}</span>
              <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
