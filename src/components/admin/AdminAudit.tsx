"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type Log = { created_at: string; actor_email: string | null; action: string; target_type: string | null; target_id: string | null; ip: string | null };

export function AdminAudit() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");

  async function load() {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (action) sp.set("action", action);
    const json = await (await fetch(`/api/admin/audit?${sp}`)).json();
    setLogs(json.logs ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function exportCsv() {
    const sp = new URLSearchParams({ format: "csv" });
    if (q) sp.set("q", q);
    if (action) sp.set("action", action);
    window.open(`/api/admin/audit?${sp}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input className="flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor email…" />
        <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="action (e.g. apikey.created)" />
        <Button onClick={load}>Filter</Button>
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr><th className="p-2">Time</th><th className="p-2">Actor</th><th className="p-2">Action</th><th className="p-2">Target</th><th className="p-2">IP</th></tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="p-2 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-2 text-xs">{l.actor_email ?? "—"}</td>
                <td className="p-2"><code className="text-xs">{l.action}</code></td>
                <td className="p-2 text-xs">{l.target_type ?? ""} {l.target_id ? `(${String(l.target_id).slice(0, 8)}…)` : ""}</td>
                <td className="p-2 text-xs">{l.ip ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={5}>No audit entries.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
