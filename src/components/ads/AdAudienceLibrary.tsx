"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

type Audience = { id: string; name: string; country: string | null; age_min: number | null; age_max: number | null; gender: string | null; interests: string[]; audience_type: string };

export function AdAudienceLibrary() {
  const [items, setItems] = useState<Audience[]>([]);
  const [f, setF] = useState({ name: "", country: "", age_min: 18, age_max: 65, gender: "all", interests: "" });
  function load() { fetch("/api/ads/audiences").then((r) => r.json()).then((d) => setItems(d.audiences ?? [])); }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!f.name.trim()) return;
    await fetch("/api/ads/audiences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, interests: f.interests.split(",").map((s) => s.trim()).filter(Boolean) }) });
    setF({ name: "", country: "", age_min: 18, age_max: 65, gender: "all", interests: "" }); load();
  }
  async function remove(id: string) { await fetch(`/api/ads/audiences?id=${id}`, { method: "DELETE" }); load(); }

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <CardTitle className="text-base">Save an audience</CardTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label htmlFor="aal-name">Name</Label><Input id="aal-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label htmlFor="aal-country">Country</Label><Input id="aal-country" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></div>
          <div><Label htmlFor="aal-gender">Gender</Label><select id="aal-gender" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="all">All</option><option value="female">Female</option><option value="male">Male</option></select></div>
          <div><Label htmlFor="aal-age-min">Age min</Label><Input id="aal-age-min" type="number" value={f.age_min} onChange={(e) => setF({ ...f, age_min: Number(e.target.value) })} /></div>
          <div><Label htmlFor="aal-age-max">Age max</Label><Input id="aal-age-max" type="number" value={f.age_max} onChange={(e) => setF({ ...f, age_max: Number(e.target.value) })} /></div>
          <div className="sm:col-span-3"><Label htmlFor="aal-interests">Interests (comma-separated)</Label><Input id="aal-interests" value={f.interests} onChange={(e) => setF({ ...f, interests: e.target.value })} /></div>
        </div>
        <Button onClick={add} disabled={!f.name.trim()}>Save audience</Button>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <Card key={a.id} className="space-y-1">
            <div className="flex items-center justify-between"><span className="font-semibold">{a.name}</span><button onClick={() => remove(a.id)} className="text-xs text-red-600 hover:underline">Delete</button></div>
            <p className="text-xs text-muted-foreground">{a.country || "Any"} · {a.age_min}-{a.age_max} · {a.gender}</p>
            {a.interests?.length > 0 && <p className="text-xs text-muted-foreground">{a.interests.join(", ")}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
