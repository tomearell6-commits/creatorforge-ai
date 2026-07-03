"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

type Stats = { accounts: number; connected: number; failedSyncs: number; messages: number; drafts: number; sent: number; attention: number; rules: number; creditsUsed: number };

export function AdminEmailAssistant() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/email-assistant/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => (j.ok ? setStats(j.stats) : setError(j.message ?? "Failed to load")))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <Alert variant="error">{error}</Alert>;
  if (!stats) return <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Spinner size="sm" /> Loading…</div>;

  const cards = [
    { label: "Connected accounts", value: stats.connected },
    { label: "Total accounts", value: stats.accounts },
    { label: "Failed syncs", value: stats.failedSyncs },
    { label: "Messages processed", value: stats.messages },
    { label: "Drafts generated", value: stats.drafts },
    { label: "Replies sent", value: stats.sent },
    { label: "Attention items", value: stats.attention },
    { label: "Automation rules", value: stats.rules },
    { label: "Credits consumed", value: stats.creditsUsed },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </Card>
        ))}
      </div>
      <Alert variant="info">
        Privacy by design: this panel shows aggregate counts only. Email content, addresses, subjects,
        and drafts are protected by row-level security and are never accessible to administrators.
      </Alert>
    </div>
  );
}
