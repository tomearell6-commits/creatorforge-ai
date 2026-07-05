"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Inbox, MailCheck, Package, CalendarDays, ListChecks, Target, Wallet } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type Summary = {
  health: { score: number; grade: string; topRecommendations: string[] };
  todayInquiries: number;
  openInquiries: number;
  draftRepliesReady: number;
  productsPublished: number;
  scheduledPosts: number;
  pendingApprovals: number;
  weeklyLeads: number;
  credits: { remaining: number; plan: string } | null;
  recentActivity: { action: string; detail: string | null; created_at: string }[];
};

function Stat({ label, value, href, icon: Icon }: { label: string; value: number | string; href: string; icon: typeof Inbox }) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:border-brand-500/60">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-brand-100 p-2 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xl font-bold leading-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function ExecDashboard() {
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/business/summary").then((r) => (r.ok ? r.json() : null)).then(setS).catch(() => {});
  }, []);

  if (!s) return <div className="flex justify-center py-12"><Spinner /></div>;

  const scoreColor = s.health.score >= 80 ? "text-brand-600" : s.health.score >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div className="space-y-6">
      {/* Health + credits header */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Business Health Score</CardTitle>
              <CardDescription className="mt-1">Deterministic score over your real activity.</CardDescription>
            </div>
            <Link href="/dashboard/business/health" className="text-right">
              <p className={`text-4xl font-extrabold ${scoreColor}`}>{s.health.score}</p>
              <Badge variant={s.health.grade === "A" ? "success" : s.health.grade === "B" ? "brand" : "warning"}>Grade {s.health.grade}</Badge>
            </Link>
          </div>
          {s.health.topRecommendations.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {s.health.topRecommendations.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> {r}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardDescription>Credits</CardDescription>
          <p className="mt-1 text-2xl font-bold">{s.credits?.remaining.toLocaleString() ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{s.credits?.plan ?? ""} plan</p>
          <div className="mt-3 flex gap-2">
            <Button asChild size="sm"><Link href="/dashboard/credits"><Wallet className="h-4 w-4" /> Top Up</Link></Button>
            <Button asChild size="sm" variant="ghost"><Link href="/dashboard/billing">Billing</Link></Button>
          </div>
        </Card>
      </div>

      {/* Stat grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today's inquiries" value={s.todayInquiries} href="/dashboard/business/inquiries" icon={Inbox} />
        <Stat label="Open inquiries" value={s.openInquiries} href="/dashboard/business/inquiries" icon={Inbox} />
        <Stat label="Draft replies ready" value={s.draftRepliesReady} href="/dashboard/business/inquiries" icon={MailCheck} />
        <Stat label="Products published" value={s.productsPublished} href="/dashboard/business/products" icon={Package} />
        <Stat label="Scheduled posts" value={s.scheduledPosts} href="/dashboard/autopilot/queue" icon={CalendarDays} />
        <Stat label="Pending approvals" value={s.pendingApprovals} href="/dashboard/autopilot/queue" icon={ListChecks} />
        <Stat label="Weekly leads" value={s.weeklyLeads} href="/dashboard/leads" icon={Target} />
        <Stat label="Reports" value="Generate" href="/dashboard/business/reports" icon={Sparkles} />
      </div>

      {/* Quick actions + activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Quick actions</CardTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm"><Link href="/dashboard/business/inquiries">Review Inquiries</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/business/documents">Create Quotation</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/business/products">Add Product</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/business/marketing">Plan Campaign</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/business/reports">Weekly Report</Link></Button>
          </div>
        </Card>
        <Card>
          <CardTitle>Recent AI activity</CardTitle>
          {s.recentActivity.length === 0 ? (
            <CardDescription className="mt-2">Automation activity appears here with a full audit trail.</CardDescription>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {s.recentActivity.map((a, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">
                    <span className="font-mono text-xs text-brand-600">{a.action}</span>
                    {a.detail ? ` — ${a.detail}` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
