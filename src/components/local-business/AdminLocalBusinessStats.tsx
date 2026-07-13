"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type Stats = { accounts: number; locations: number; audits: number; posts: number; images: number; reviewDrafts: number; failedPublishJobs: number };

export function AdminLocalBusinessStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/local-business/stats").then((r) => r.json()).then((j) => { setStats(j.stats ?? null); setLive(!!j.liveApiConfigured); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div>;
  if (!stats) return <Card className="p-6 text-sm text-muted-foreground">No data.</Card>;

  const cards = [
    { label: "Connected accounts", value: stats.accounts },
    { label: "Locations", value: stats.locations },
    { label: "Audits run", value: stats.audits },
    { label: "Posts created", value: stats.posts },
    { label: "Images generated", value: stats.images },
    { label: "Review drafts", value: stats.reviewDrafts },
    { label: "Failed publish jobs", value: stats.failedPublishJobs },
  ];

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-2 p-4">
        <span className="text-sm font-medium">Google Business Profile API</span>
        <Badge variant={live ? "success" : "warning"}>{live ? "configured" : "not configured — features gated"}</Badge>
      </Card>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4"><div className="text-2xl font-bold">{c.value}</div><div className="text-xs text-muted-foreground">{c.label}</div></Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Aggregate counts only — admins never see private business content unless explicit, logged support access is granted.</p>
    </div>
  );
}
