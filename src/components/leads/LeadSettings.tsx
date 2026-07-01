"use client";

import { Card, CardTitle } from "@/components/ui/Card";
import { ComplianceWarningBox } from "./ComplianceWarningBox";
import { LEAD_CREDIT_COSTS } from "@/lib/leads/constants";

const PROVIDERS = [
  { name: "Firecrawl", role: "Public web crawling & extraction", env: "FIRECRAWL_API_KEY" },
  { name: "NeverBounce", role: "Email deliverability verification", env: "NEVERBOUNCE_API_KEY" },
  { name: "Brevo", role: "List sync & email outreach", env: "BREVO_API_KEY" },
];

const COST_ROWS: { label: string; value: string }[] = [
  { label: "Page scan (per page crawled)", value: `${LEAD_CREDIT_COSTS.pageScan} credit` },
  { label: "Extraction", value: LEAD_CREDIT_COSTS.extraction === 0 ? "Bundled into page scan" : `${LEAD_CREDIT_COSTS.extraction} credit` },
  { label: "Contact discovery (per contact page)", value: `${LEAD_CREDIT_COSTS.contactDiscovery} credit` },
  { label: "Email verification (per email)", value: `${LEAD_CREDIT_COSTS.emailVerify} credit` },
  { label: "Brevo sync", value: `1 credit / ${LEAD_CREDIT_COSTS.brevoSyncPer} contacts` },
  { label: "Campaign send", value: `1 credit / ${LEAD_CREDIT_COSTS.campaignSendPer} emails` },
  { label: "Campaign create", value: `${LEAD_CREDIT_COSTS.campaignCreate} credits` },
];

export function LeadSettings() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <CardTitle className="text-base">Providers</CardTitle>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Provider</th>
                <th className="p-3">Used for</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDERS.map((p) => (
                <tr key={p.name} className="border-b border-border/50 last:border-0">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-muted-foreground">{p.role}</td>
                  <td className="p-3 text-muted-foreground">Configured via {p.env} on the server</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-xs text-muted-foreground">
          Provider keys are set server-side and never exposed to the browser. Features activate automatically once their key is configured.
        </p>
      </section>

      <section className="space-y-2">
        <CardTitle className="text-base">Credit costs</CardTitle>
        <Card>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {COST_ROWS.map((r) => (
              <li key={r.label} className="flex justify-between gap-3">
                <span>{r.label}</span>
                <span className="font-medium">{r.value}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Credits are only charged when a real provider runs. Viewing leads, lists, and reports is always free.
          </p>
        </Card>
      </section>

      <section className="space-y-2">
        <CardTitle className="text-base">Compliance</CardTitle>
        <ComplianceWarningBox />
      </section>
    </div>
  );
}
