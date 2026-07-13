"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MapPin, Plus, ArrowRight, Building2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { GoogleConnectionCard } from "./GoogleConnectionCard";
import { LB_PAGES } from "@/config/localBusiness";

type Account = { id: string; google_email: string | null; status: string; expires_at: string | null; last_synced_at: string | null; connected_at: string };
type Location = { id: string; business_name: string; address: string | null; primary_category: string | null; profile_status: string; audit_score: number | null; connection_status: string };

// Sections with real pages today; the rest render as "coming soon" (no 404).
const BUILT = new Set(["overview", "settings", "audit", "optimizer", "posts", "images", "calendar", "publishing"]);

export function LocalBusinessDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [liveApi, setLiveApi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/local-business/accounts").then((r) => r.json()).then((j) => {
      setAccounts(j.accounts ?? []); setLocations(j.locations ?? []); setLiveApi(!!j.liveApi);
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addLocation() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/local-business/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_name: newName.trim() }) });
      setNewName(""); setAdding(false); load();
    } finally { setBusy(false); }
  }

  const healthy = locations.filter((l) => (l.audit_score ?? 0) >= 70).length;
  const needsAttention = locations.filter((l) => (l.audit_score ?? 0) < 70).length;
  const avgHealth = locations.length ? Math.round(locations.reduce((a, l) => a + (l.audit_score ?? 0), 0) / locations.length) : 0;

  if (loading) return <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div>;

  return (
    <div className="space-y-6">
      <GoogleConnectionCard accounts={accounts} liveApi={liveApi} onChange={load} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Connected profiles", value: accounts.length },
          { label: "Active locations", value: locations.length },
          { label: "Overall profile health", value: locations.length ? `${avgHealth}` : "—" },
          { label: "Needs attention", value: needsAttention },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Locations */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-brand-600" />
          <h2 className="text-base font-semibold">Business locations</h2>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setAdding((v) => !v)}><Plus className="h-4 w-4" /> Add location</Button>
        </div>
        {adding && (
          <div className="mt-3 flex gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Business name" />
            <Button onClick={addLocation} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : "Add"}</Button>
          </div>
        )}
        {locations.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No locations yet. Connect Google above, or add one manually to start auditing and planning content.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {locations.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.business_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{[l.primary_category, l.address].filter(Boolean).join(" · ") || "No details yet"}</p>
                </div>
                {l.audit_score != null && <Badge variant={l.audit_score >= 70 ? "success" : "warning"}>Health {l.audit_score}</Badge>}
                <Badge variant="default">{l.connection_status}</Badge>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{healthy} healthy · {needsAttention} need attention</p>
          </div>
        )}
      </Card>

      {/* Section grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground">Studio sections</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {LB_PAGES.filter((p) => p.id !== "overview").map((p) => {
            const built = BUILT.has(p.id);
            const inner = (
              <Card className={`flex h-full items-center gap-2 p-3 ${built ? "hover:border-brand-500/50" : "opacity-60"}`}>
                <span className="flex-1 text-sm font-medium">{p.label}</span>
                {built ? <ArrowRight className="h-4 w-4 text-brand-600" /> : <Badge variant="default">soon</Badge>}
              </Card>
            );
            return built ? <Link key={p.id} href={p.route}>{inner}</Link> : <div key={p.id}>{inner}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
