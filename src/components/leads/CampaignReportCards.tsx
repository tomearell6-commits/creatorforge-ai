"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

type Report = {
  totalLeads: number;
  verifiedLeads: number;
  invalidEmails: number;
  readyForOutreach: number;
  campaignsSent: number;
  bounceRate: number;
  unsubscribeRate: number;
  creditsUsed: number;
  recentCampaigns: { id: string; name: string; leads?: number; sent?: number; created_at?: string }[];
};

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "danger" | "brand" }) {
  return (
    <Card className="p-4">
      <div
        className={`text-2xl font-bold ${tone === "danger" ? "text-red-600" : tone === "brand" ? "text-brand-600" : ""}`}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

export function CampaignReportCards() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leads/reports")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load reports."))))
      .then((d) => setReport(d))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load reports."));
  }, []);

  if (error) return <Alert variant="error" title="Reports unavailable">{error}</Alert>;
  if (!report)
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner size="sm" /> Loading reports…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total leads" value={report.totalLeads} />
        <Stat label="Verified" value={report.verifiedLeads} tone="brand" />
        <Stat label="Invalid" value={report.invalidEmails} tone="danger" />
        <Stat label="Ready for outreach" value={report.readyForOutreach} tone="brand" />
        <Stat label="Campaigns sent" value={report.campaignsSent} />
        <Stat label="Bounce rate" value={`${report.bounceRate}%`} tone={report.bounceRate > 5 ? "danger" : undefined} />
        <Stat label="Unsubscribe rate" value={`${report.unsubscribeRate}%`} />
        <Stat label="Credits used" value={report.creditsUsed} />
      </div>

      <div className="space-y-2">
        <CardTitle className="text-base">Recent campaigns</CardTitle>
        <Card>
          {report.recentCampaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns yet.</p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {report.recentCampaigns.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {typeof c.leads === "number" ? `${c.leads} leads` : ""}
                    {typeof c.sent === "number" ? ` · ${c.sent} sent` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
