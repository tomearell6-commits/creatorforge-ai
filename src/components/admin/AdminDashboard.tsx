import { Card } from "@/components/ui/Card";
import type { AdminOverview } from "@/lib/admin-overview";

function Stat({ label, value }: { label: string; value: string | number }) {
  return <Card className="p-4"><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></Card>;
}

/** The dashboard numbers. Rendered on the server; the data arrives with the page. */
export function AdminDashboard({ d }: { d: AdminOverview }) {
  return (
    <div className="space-y-6">
      {d.alerts.length > 0 && (
        <div className="space-y-2">
          {d.alerts.map((a, i) => (
            <div key={i} className={`rounded-lg border p-3 text-sm ${a.level === "critical" ? "border-red-300 bg-red-50 text-red-700" : a.level === "warning" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-border bg-muted/40"}`}>
              {a.level === "critical" ? "🔴" : a.level === "warning" ? "⚠️" : "ℹ️"} {a.message}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total users" value={d.totalUsers} />
        <Stat label="Active (30d)" value={d.activeUsers} />
        <Stat label="MRR" value={`$${d.mrr}`} />
        <Stat label="ARR" value={`$${d.arr}`} />
        <Stat label="Active subscriptions" value={d.activeSubscriptions} />
        <Stat label="Revenue (all-time)" value={`$${d.revenueTotal.toFixed(0)}`} />
        <Stat label="Credits consumed" value={d.creditConsumption} />
        <Stat label="Credits outstanding" value={d.creditsOutstanding} />
        <Stat label="Renders" value={d.renders} />
        <Stat label="Published videos" value={d.published} />
        <Stat label="API requests" value={d.apiRequests} />
        <Stat label="Active API keys" value={d.activeApiKeys} />
        <Stat label="Storage" value={`${(d.storageBytes / 1024 ** 2).toFixed(1)} MB`} />
        <Stat label="Failed jobs" value={d.failedJobs} />
        <Stat label="Open tickets" value={d.openTickets} />
      </div>
      <Card>
        <h3 className="font-semibold">Plan mix</h3>
        <div className="mt-3 space-y-1 text-sm">
          {Object.entries(d.planMix).map(([plan, n]) => (
            <div key={plan} className="flex justify-between"><span className="capitalize">{plan}</span><span>{n}</span></div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Same layout as the dashboard, as soft grey placeholders, shown the instant the page opens. */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 15 }).map((_, i) => (
          <Card key={i} className="animate-pulse p-4">
            <div className="h-7 w-16 rounded bg-muted" />
            <div className="mt-2 h-3 w-24 rounded bg-muted" />
          </Card>
        ))}
      </div>
      <Card className="animate-pulse">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-3 w-full rounded bg-muted" />)}
        </div>
      </Card>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
