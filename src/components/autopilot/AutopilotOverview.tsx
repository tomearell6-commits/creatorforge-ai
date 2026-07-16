"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Rocket, Megaphone, ListChecks, BarChart3, Lightbulb, Plus } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function AutopilotOverview() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [recs, setRecs] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/autopilot/campaigns").then((r) => r.json()).then((d) => setCampaigns(d.campaigns ?? []));
    fetch("/api/autopilot/reports?period=weekly").then((r) => r.json()).then((d) => setReport(d.report));
    fetch("/api/autopilot/recommendations").then((r) => r.json()).then((d) => setRecs(d.recommendations ?? []));
  }, []);

  const active = campaigns.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white"><Rocket className="h-5 w-5" /></span>
          <div><CardTitle>CreatorsForge Autopilot</CardTitle><p className="text-sm text-muted-foreground">Configure your strategy once — Autopilot plans, schedules, and (in Full mode) publishes.</p></div>
        </div>
        <Button asChild variant="accent"><Link href="/dashboard/autopilot/campaigns/new"><Plus className="h-4 w-4" /> New campaign</Link></Button>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Campaigns" value={campaigns.length} />
        <Stat label="Active" value={active} />
        <Stat label="Published (7d)" value={report?.published ?? 0} />
        <Stat label="Success rate" value={report ? `${report.successRate}%` : "—"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Quick href="/dashboard/autopilot/campaigns" icon={<Megaphone className="h-4 w-4" />} label="Campaigns" />
        <Quick href="/dashboard/autopilot/queue" icon={<ListChecks className="h-4 w-4" />} label="Publishing Queue" />
        <Quick href="/dashboard/autopilot/reports" icon={<BarChart3 className="h-4 w-4" />} label="Reports" />
      </div>

      <Card>
        <CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-amber-500" /> AI recommendations</CardTitle>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          {recs.map((r, i) => <li key={i} className="flex gap-2"><span className="text-brand-500">•</span> {r}</li>)}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">These are suggestions only — Autopilot never acts on them automatically.</p>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <Card className="p-4"><div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div><div className="text-xs text-muted-foreground">{label}</div></Card>;
}
function Quick({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return <Link href={href} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm font-medium hover:bg-muted">{icon} {label}</Link>;
}
