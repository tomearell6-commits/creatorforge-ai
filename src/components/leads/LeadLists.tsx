"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListChecks, Users, Send } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { LeadExportButton } from "./LeadExportButton";

type LeadList = { id: string; name: string; member_count?: number };

export function LeadLists() {
  const [lists, setLists] = useState<LeadList[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/leads/lists");
      const d = res.ok ? await res.json() : { lists: [] };
      setLists(d.lists ?? []);
    } catch {
      setLists([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Could not create list.");
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div>
          <CardTitle>New list</CardTitle>
          <CardDescription>Group leads for export or Brevo sync.</CardDescription>
        </div>
        <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="list-name">List name</Label>
            <Input id="list-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sydney pet shops — verified" />
          </div>
          <Button type="submit" variant="accent" disabled={creating || !name.trim()}>
            {creating ? <><Spinner size="sm" /> Creating…</> : "Create list"}
          </Button>
        </form>
        {error && <Alert variant="error" title="Could not create list">{error}</Alert>}
      </Card>

      {lists === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" /> Loading lists…
        </div>
      ) : lists.length === 0 ? (
        <EmptyState icon={ListChecks} title="No lists yet" description="Create a list above to organize your leads." />
      ) : (
        <ul className="space-y-2">
          {lists.map((l) => (
            <li key={l.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{l.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" aria-hidden /> {l.member_count ?? 0} member{l.member_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/leads/lists?listId=${l.id}`}>View leads</Link>
                  </Button>
                  <LeadExportButton listId={l.id} />
                  <Button asChild size="sm" variant="accent">
                    <Link href={`/dashboard/leads/campaigns?list=${l.id}`}>
                      <Send className="h-4 w-4" aria-hidden /> Start campaign
                    </Link>
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
