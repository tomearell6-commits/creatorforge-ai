"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Report = { campaign_id: string; platform: string; clicks: number; impressions: number; reach: number; spend: number; conversions: number; ctr: number; cpc: number; cpa: number; roas: number; reported_at: string };

export function AdCampaignReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [limited, setLimited] = useState(true);
  useEffect(() => { fetch("/api/ads/reports").then((r) => r.json()).then((d) => { setReports(d.reports ?? []); setLimited(d.limited); }); }, []);

  if (limited) {
    return (
      <Card className="py-10 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Reporting is limited right now.</p>
        <p className="mt-1">Live metrics (clicks, impressions, spend, conversions, CTR, CPC, ROAS) appear here once you connect a supported ad account whose API exposes reporting. Connect one under <span className="text-brand-700">Connected Ad Accounts</span>.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs text-muted-foreground">
          <tr><th className="p-3">Platform</th><th className="p-3">Clicks</th><th className="p-3">Impr.</th><th className="p-3">Spend</th><th className="p-3">Conv.</th><th className="p-3">CTR</th><th className="p-3">CPC</th><th className="p-3">ROAS</th></tr>
        </thead>
        <tbody>
          {reports.map((r, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="p-3 capitalize">{r.platform}</td><td className="p-3">{r.clicks ?? "—"}</td><td className="p-3">{r.impressions ?? "—"}</td>
              <td className="p-3">{r.spend != null ? `$${r.spend}` : "—"}</td><td className="p-3">{r.conversions ?? "—"}</td>
              <td className="p-3">{r.ctr != null ? `${r.ctr}%` : "—"}</td><td className="p-3">{r.cpc != null ? `$${r.cpc}` : "—"}</td><td className="p-3">{r.roas != null ? `${r.roas}x` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
