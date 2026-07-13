"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

type Stats = { contentProjects: number; variations: number; campaigns: number; publishJobs: number; failedPublishJobs: number; replyDrafts: number; reports: number };

export function AdminSocialBusinessStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/admin/social-business/stats").then((r) => r.json()).then((j) => setStats(j.stats ?? null)).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading…</div>;
  if (!stats) return <Card className="p-6 text-sm text-muted-foreground">No data.</Card>;

  const cards = [
    { label: "Content projects", value: stats.contentProjects }, { label: "Variations", value: stats.variations },
    { label: "Campaigns", value: stats.campaigns }, { label: "Publish jobs", value: stats.publishJobs },
    { label: "Failed jobs", value: stats.failedPublishJobs }, { label: "Reply drafts", value: stats.replyDrafts },
    { label: "Reports", value: stats.reports },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => <Card key={c.label} className="p-4"><div className="text-2xl font-bold">{c.value}</div><div className="text-xs text-muted-foreground">{c.label}</div></Card>)}
      </div>
      <p className="text-xs text-muted-foreground">Aggregate counts only — admins never see private messages or content unless explicit, logged support access is granted.</p>
    </div>
  );
}
