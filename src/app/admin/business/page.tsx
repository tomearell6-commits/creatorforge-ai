"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

type Data = {
  stats: Record<string, number>;
  recentActivity: { action: string; detail: string | null; created_at: string }[];
};

const LABELS: Record<string, string> = {
  companyProfiles: "Company profiles",
  products: "Products",
  inquiries: "Inquiries",
  draftReplies: "Draft replies",
  documents: "Documents",
  reports: "Reports",
  activity7d: "Automation actions (7d)",
};

export default function AdminBusinessPage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/admin/business").then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Business Ops Manager</h1>
      <p className="mt-1 text-muted-foreground">Aggregate usage only — customer content is never shown here.</p>
      {!data ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(data.stats).map(([k, v]) => (
              <Card key={k}>
                <CardDescription>{LABELS[k] ?? k}</CardDescription>
                <p className="mt-1 text-2xl font-bold">{v.toLocaleString()}</p>
              </Card>
            ))}
          </div>
          <Card>
            <CardTitle>Recent automation activity</CardTitle>
            <ul className="mt-3 divide-y divide-border text-sm">
              {data.recentActivity.map((a, i) => (
                <li key={i} className="flex justify-between gap-2 py-2">
                  <span className="truncate"><span className="font-mono text-xs text-brand-600">{a.action}</span>{a.detail ? ` — ${a.detail}` : ""}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
              {data.recentActivity.length === 0 && <li className="py-2 text-muted-foreground">No activity yet.</li>}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
