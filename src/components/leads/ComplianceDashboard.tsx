"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type Access = {
  complianceAccepted: boolean;
  senderProfileComplete: boolean;
};

type Lead = { lead_status?: string; do_not_contact?: boolean };

type Campaign = { name?: string; status?: string };

type Reports = {
  bounceRate?: number;
  recentCampaigns?: Campaign[];
};

/**
 * At-a-glance compliance posture for the Lead Generator: policy acceptance,
 * sender profile, do-not-contact & unsubscribe counts, bounce rate, and the
 * status of the most recent campaign.
 */
export function ComplianceDashboard() {
  const [access, setAccess] = useState<Access | null>(null);
  const [reports, setReports] = useState<Reports | null>(null);
  const [dnc, setDnc] = useState(0);
  const [unsub, setUnsub] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/leads/access/status").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/leads/reports").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/leads/list?limit=500").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([a, rep, list]) => {
      setAccess(a?.access ?? null);
      setReports(rep ?? null);
      const leads: Lead[] = list?.leads ?? [];
      setDnc(leads.filter((l) => l.do_not_contact || l.lead_status === "do_not_contact").length);
      setUnsub(leads.filter((l) => l.lead_status === "unsubscribed").length);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner size="sm" /> Loading compliance status…
      </div>
    );
  }

  const bounceRate = reports?.bounceRate != null ? `${(reports.bounceRate * 100).toFixed(1)}%` : "—";
  const lastCampaign = reports?.recentCampaigns?.[0];

  const items: { label: string; value: string; badge?: { variant: "success" | "warning" | "danger" | "info" | "default"; text: string } }[] = [
    {
      label: "Compliance policy",
      value: "",
      badge: access?.complianceAccepted
        ? { variant: "success", text: "Accepted" }
        : { variant: "warning", text: "Not accepted" },
    },
    {
      label: "Sender profile",
      value: "",
      badge: access?.senderProfileComplete
        ? { variant: "success", text: "Complete" }
        : { variant: "warning", text: "Incomplete" },
    },
    { label: "Do-not-contact", value: String(dnc) },
    { label: "Unsubscribed", value: String(unsub) },
    {
      label: "Bounce rate",
      value: bounceRate,
      badge:
        reports?.bounceRate != null && reports.bounceRate > 0.05
          ? { variant: "danger", text: "High" }
          : undefined,
    },
    {
      label: "Last campaign",
      value: lastCampaign?.name ?? "None yet",
      badge: lastCampaign?.status ? { variant: "info", text: lastCampaign.status } : undefined,
    },
  ];

  const allGood = access?.complianceAccepted && access?.senderProfileComplete;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        {allGood ? (
          <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden />
        ) : (
          <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden />
        )}
        <CardTitle className="text-base">Compliance status</CardTitle>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <Card key={it.label} className="p-4">
            <p className="text-xs text-muted-foreground">{it.label}</p>
            <div className="mt-1 flex items-center gap-2">
              {it.value && <p className="truncate text-sm font-semibold">{it.value}</p>}
              {it.badge && <Badge variant={it.badge.variant}>{it.badge.text}</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
