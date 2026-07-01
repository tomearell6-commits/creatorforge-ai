"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

type Stats = {
  totalScans: number;
  firecrawlUsage: number;
  neverbounceUsage: number;
  brevoUsage: number;
  creditsConsumed: number;
  failedScans: number;
  complianceWarnings: number;
  bounceRate: number;
  unsubscribeRate: number;
};

type ComplianceLog = {
  action: string;
  detail: string | null;
  created_at: string;
};

/** Map a compliance action to a Badge tone. */
function actionVariant(action: string): "success" | "danger" | "warning" | "info" | "default" {
  if (action.startsWith("suppress_") || action === "blocked_url") return "danger";
  if (action === "skip_robots") return "warning";
  if (["scan", "extract", "verify"].includes(action)) return "info";
  if (["sync", "send"].includes(action)) return "success";
  return "default";
}

export function AdminLeads() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<ComplianceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/leads/analytics");
        if (!res.ok) throw new Error();
        const json = await res.json().catch(() => ({}));
        setStats(json.stats ?? null);
        setLogs(Array.isArray(json.recentCompliance) ? json.recentCompliance : []);
      } catch {
        setError("Couldn't load Lead Generator analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading lead analytics" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && <Alert variant="error">{error}</Alert>}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total lead scans" value={stats?.totalScans} />
        <StatCard label="Firecrawl usage" value={stats?.firecrawlUsage} />
        <StatCard label="NeverBounce usage" value={stats?.neverbounceUsage} />
        <StatCard label="Brevo usage" value={stats?.brevoUsage} />
        <StatCard label="Credits consumed" value={stats?.creditsConsumed} />
        <StatCard label="Failed scans" value={stats?.failedScans} tone="danger" />
        <StatCard label="Compliance warnings" value={stats?.complianceWarnings} tone="warning" />
        <TextStatCard label="Bounce rate" value={pct(stats?.bounceRate)} tone="danger" raw={stats?.bounceRate} />
        <TextStatCard
          label="Unsubscribe rate"
          value={pct(stats?.unsubscribeRate)}
          tone="warning"
          raw={stats?.unsubscribeRate}
        />
      </div>

      {/* Recent compliance log */}
      <section className="space-y-3">
        <CardTitle className="text-base">Recent compliance activity</CardTitle>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Action</th>
                <th className="p-3">Detail</th>
                <th className="p-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-muted-foreground">
                    No compliance activity yet.
                  </td>
                </tr>
              )}
              {logs.map((l, i) => (
                <tr key={i} className="border-b border-border/50 align-top">
                  <td className="p-3">
                    <Badge variant={actionVariant(l.action)}>{l.action.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="p-3 max-w-[28rem] text-muted-foreground">{l.detail ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "…";
  return `${v}%`;
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number;
  tone?: "danger" | "warning";
}) {
  const color =
    tone === "danger" && (value ?? 0) > 0
      ? "text-red-600 dark:text-red-400"
      : tone === "warning" && (value ?? 0) > 0
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <Card className="p-4">
      <div className={`text-xl font-bold ${color}`}>{value ?? "…"}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

function TextStatCard({
  label,
  value,
  tone,
  raw,
}: {
  label: string;
  value: string;
  tone?: "danger" | "warning";
  raw?: number;
}) {
  const color =
    tone === "danger" && (raw ?? 0) > 0
      ? "text-red-600 dark:text-red-400"
      : tone === "warning" && (raw ?? 0) > 0
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <Card className="p-4">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
