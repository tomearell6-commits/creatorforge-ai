"use client";

import Link from "next/link";
import { Search, ListChecks, FileText, Send } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { CampaignReportCards } from "./CampaignReportCards";
import { ComplianceWarningBox } from "./ComplianceWarningBox";

const QUICK_LINKS = [
  { href: "/dashboard/leads/search", icon: Search, title: "New lead search", desc: "Find public business contacts." },
  { href: "/dashboard/leads/lists", icon: ListChecks, title: "Lists", desc: "Organize and export leads." },
  { href: "/dashboard/leads/templates", icon: FileText, title: "Templates", desc: "Draft outreach emails." },
  { href: "/dashboard/leads/campaigns", icon: Send, title: "Campaigns", desc: "Sync and send via Brevo." },
];

export function LeadCampaignDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors hover:border-brand-500">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-900 text-brand-300 dark:bg-brand-950/50 dark:text-brand-300">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <CardTitle className="mt-3 text-base group-hover:text-brand-600">{title}</CardTitle>
              <CardDescription className="mt-1">{desc}</CardDescription>
            </Card>
          </Link>
        ))}
      </div>

      <CampaignReportCards />

      <ComplianceWarningBox />
    </div>
  );
}
